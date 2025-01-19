const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/VerifyToken')

const baseURL = "https://deaf-janela-anoukh-eb7ffe47.koyeb.app";

const redirect = async (req, res, next) => {
    try {
        let url = baseURL + req.url;

        // Add query parameters
        url += req.url.includes("?") ? "&" : "?";
        url += "userID=" + req.user._id +
            "&userRole=" + req.user.role +
            "&isAdmin" + req.user.isAdmin;

        const _req = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization,
            },
            body: req.method == "GET" || req.method == "HEAD" ? null : JSON.stringify(req.body),
        });
        let data = await _req.text();

        if (/^[\],:{}\s]*$/.test(data.replace(/\\["\\\/bfnrtu]/g, '@').
            replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
            replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) { // Check if the data is JSON

            data = JSON.parse(data);
            res.status(_req.status).json(data);
            return;
        }
        res.status(_req.status).send(data);
    }
    catch (err) {
        console.error(err);
        res.status(500).send({
            success: false,
            message: req.__("Java Server Error")
        });
    }
}


router.get("*", verifyToken, redirect);
router.post("*", verifyToken, redirect);

module.exports = router