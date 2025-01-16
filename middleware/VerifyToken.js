require('dotenv').config()
const jwt = require('jsonwebtoken')
const { sanitizeUser } = require('../utils/SanitizeUser')

exports.verifyToken = async (req, res, next) => {
    try {
        // extract the token from request cookies
        const { token } = req.cookies

        // if token is not there, return 401 response
        if (!token) {
            return res.status(401).json({
                success: false,
                message: req.__("Token Missing")
            })
        }
        // verifies the token 
        const decodedInfo = jwt.verify(token, process.env.SECRET_KEY)

        // checks if decoded info contains legit details, then set that info in req.user and calls next
        if (decodedInfo && decodedInfo._id && decodedInfo.email) {
            req.user = decodedInfo
            next()
        }

        // if token is invalid then sends the response accordingly
        else {
            return res.status(401).json({
                success: false,
                message: req.__("Invalid Token")
            })
        }

    } catch (error) {

        console.log(error);

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: req.__("Token Expired")
            });
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: req.__("Invalid Token")
            });
        }
        else {
            return res.status(500).json({
                success: false,
                message: req.__("Internal Server Error")
            });
        }
    }
}