const User = require("../models/User");
const bcrypt = require('bcryptjs');
const { sendMail } = require("../utils/Emails");
const { generateOTP } = require("../utils/GenerateOtp");
const Otp = require("../models/OTP");
const { sanitizeUser } = require("../utils/SanitizeUser");
const { generateToken } = require("../utils/GenerateToken");
const PasswordResetToken = require("../models/PasswordResetToken");

exports.signup = async (req, res) => {

    /*
    * @params req.body.name : string
    * @params req.body.email : string
    * @params req.body.password : string
    * @params req.body.role : string
    * @params req.body.phone : string
    * @params req.body.address : string
    * @params req.body.city : string
    * @params req.body.state : string
    * @params req.body.country : string
    * @params req.body.pincode : string
    * @params req.body.language : string
    * @params req.body.isVerified : boolean
    * @params req.body.isBlocked : boolean
    * @params req.body.isDeleted : boolean
    * @params req.body.isSuspended : boolean
    */
    try {
        const existingUser = await User.findOne({ email: req.body.email })

        // if user already exists
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: req.__("User Already Exists")
            })
        }

        // hashing the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        req.body.password = hashedPassword

        // creating new user
        //TODO dont allow user to create user with admin role
        const createdUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role,
            phone: req.body.phone,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            pincode: req.body.pincode,
        })
        await createdUser.save()

        // getting secure user info
        const secureInfo = sanitizeUser(createdUser)

        // generating jwt token
        const token = generateToken(secureInfo)

        // sending jwt token in the response cookies
        res.cookie('token', token, {
            sameSite: process.env.PRODUCTION === 'true' ? "None" : 'Lax',
            maxAge: new Date(Date.now() + (parseInt(process.env.COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000))),
            httpOnly: true,
            secure: process.env.PRODUCTION === 'true' ? true : false
        })

        res.status(201).json({
            success: true,
            data: sanitizeUser(createdUser)
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("Some Error Occured Signup")
        })
    }
}

exports.login = async (req, res) => {

    /*
    * @params req.body.email : string
    * @params req.body.password : string
    */

    try {
        // checking if user exists or not
        const existingUser = await User.findOne({ email: req.body.email })

        // if exists and password matches the hash
        if (existingUser && (await bcrypt.compare(req.body.password, existingUser.password))) {

            // getting secure user info
            const secureInfo = sanitizeUser(existingUser)

            // generating jwt token
            const token = generateToken(secureInfo)

            // sending jwt token in the response cookies
            res.cookie('token', token, {
                sameSite: process.env.PRODUCTION === 'true' ? "None" : 'Lax',
                maxAge: new Date(Date.now() + (parseInt(process.env.COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000))),
                httpOnly: false,
                secure: process.env.PRODUCTION === 'true' ? true : false
            })
            return res.status(200).json({
                success: true,
                data: sanitizeUser(existingUser)
            })
        }

        res.clearCookie('token');
        return res.status(404).json({
            success: false,
            message: req.__("Invalid Credentials")
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("Some Error Occured Login")
        })
    }
}

exports.verifyOtp = async (req, res) => {

    /*
    * @params req.body.userID : string
    * @params req.body.otp : string
    */
    try {
        // checks if user id is existing in the user collection
        const isValiduserID = await User.findById(req.body.userID)

        // if user id does not exists then returns a 404 response
        if (!isValiduserID) {
            return res.status(404).json({
                success: false,
                message: req.__("User Not Found")
            })
        }

        // checks if otp exists by that user id
        const isOtpExisting = await Otp.findOne({ user: isValiduserID._id })

        // if otp does not exists then returns a 404 response
        if (!isOtpExisting) {
            return res.status(404).json({
                success: false,
                message: req.__("OTP Not Found")
            })
        }

        // checks if the otp is expired, if yes then deletes the otp and returns response accordinly
        if (isOtpExisting.expiresAt < new Date()) {
            await Otp.findByIdAndDelete(isOtpExisting._id)
            return res.status(400).json({
                success: false,
                message: req.__("OTP Expired")
            })
        }

        // checks if otp is there and matches the hash value then updates the user verified status to true and returns the updated user
        if (isOtpExisting && (await bcrypt.compare(req.body.otp, isOtpExisting.otp))) {
            await Otp.findByIdAndDelete(isOtpExisting._id)
            const verifiedUser = await User.findByIdAndUpdate(isValiduserID._id, { isVerified: true }, { new: true })
            return res.status(200).json({
                success: true,
                data: sanitizeUser(verifiedUser)
            })
        }

        //TODO add a limit to the number of otp verification attempts
        //TODO refresh token after otp verification
        // in default case if none of the conidtion matches, then return this response
        return res.status(400).json({
            success: false,
            message: req.__("OTP General Error")
        })


    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("Some Error Occured")
        })
    }
}

exports.resendOtp = async (req, res) => {

    /*
    * @params req.body.userID : string
    */

    try {

        const existingUser = await User.findById(req.body.userID)

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: req.__("User Not Found")
            })
        }

        await Otp.deleteMany({ user: existingUser._id })

        const otp = generateOTP()
        const hashedOtp = await bcrypt.hash(otp, 10)

        const newOtp = new Otp({ user: req.body.userID, otp: hashedOtp, expiresAt: Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME) })
        await newOtp.save()

        await sendMail(
            existingUser.email,
            `OTP Verification for Your HACS Account`,
            `Your One-Time Password (OTP) for account verification is: <b><strong>${otp}</strong></b>.</br>Do not share this OTP with anyone for security reasons`)

        res.status(201).json({
            success: true,
            data: req.__("OTP Sent")
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: req.__("OTP Sent Error")
        })
        console.log(error);
    }
}

exports.forgotPassword = async (req, res) => {

    /*
    * @params req.body.email : string
    */

    let newToken;
    try {
        // checks if user provided email exists or not
        const isExistingUser = await User.findOne({ email: req.body.email })

        // if email does not exists returns a 404 response
        if (!isExistingUser) {
            return res.status(404).json({
                success: false,
                message: req.__("Mail Not Found")
            })
        }

        await PasswordResetToken.deleteMany({ user: isExistingUser._id })

        // if user exists , generates a password reset token
        const passwordResetToken = generateToken(sanitizeUser(isExistingUser), true)

        // hashes the token
        const hashedToken = await bcrypt.hash(passwordResetToken, 10)

        // saves hashed token in passwordResetToken collection
        newToken = new PasswordResetToken({ user: isExistingUser._id, token: hashedToken, expiresAt: Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME) })
        await newToken.save()

        // sends the password reset link to the user's mail
        await sendMail(isExistingUser.email, 'Password Reset Link for Your HACS Account', `<p>Dear ${isExistingUser.name},

        We received a request to reset the password for your HACS account. If you initiated this request, please use the following link to reset your password:</p>
        
        <p><a href=${process.env.ORIGIN}/reset-password/${isExistingUser._id}/${passwordResetToken} target="_blank">Reset Password</a></p>
        
        <p>This link is valid for a limited time. If you did not request a password reset, please ignore this email. Your account security is important to us.
        
        Thank you,
        The HACS Team</p>`)

        res.status(200).json({
            success: true,
            data: `${req.__("Password Reset Link Sent")}: ${isExistingUser.email}`
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("Password Reset Link Sent Error")
        })
    }
}

exports.resetPassword = async (req, res) => {

    /*
    * @params req.body.userID : string
    * @params req.body.token : string
    * @params req.body.newPassword : string
    */

    try {

        // checks if user exists or not
        const isExistingUser = await User.findById(req.body.userID)

        // if user does not exists then returns a 404 response
        if (!isExistingUser) {
            return res.status(404).json({
                success: false,
                message: req.__("User Not Found")
            })
        }

        // fetches the resetPassword token by the userID
        const isResetTokenExisting = await PasswordResetToken.findOne({ user: isExistingUser._id })

        // If token does not exists for that userID, then returns a 404 response
        if (!isResetTokenExisting) {
            return res.status(404).json({
                success: false,
                message: req.__("Reset Link Invalid")
            })
        }

        // if the token has expired then deletes the token, and send response accordingly
        if (isResetTokenExisting.expiresAt < new Date()) {
            await PasswordResetToken.findByIdAndDelete(isResetTokenExisting._id)
            return res.status(404).json({
                success: false,
                message: req.__("Reset Link Expired")
            })
        }

        // if token exists and is not expired and token matches the hash, then resets the user password and deletes the token
        if (isResetTokenExisting && isResetTokenExisting.expiresAt > new Date() && (await bcrypt.compare(req.body.token, isResetTokenExisting.token))) {

            // deleting the password reset token
            await PasswordResetToken.findByIdAndDelete(isResetTokenExisting._id)

            // resets the password after hashing it
            await User.findByIdAndUpdate(isExistingUser._id,
                { password: await bcrypt.hash(req.body.newPassword, 10) })
            return res.status(200).json({
                success: true,
                data: req.__("Password Reset Successful")
            })
        }

        return res.status(404).json({
            success: false,
            message: req.__("Reset Link Invalid")
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("Some Error Occurred Reset Password")
        })
    }
}

exports.logout = async (req, res) => {
    try {
        res.cookie('token', {
            maxAge: 0,
            sameSite: process.env.PRODUCTION === 'true' ? "None" : 'Lax',
            httpOnly: true,
            secure: process.env.PRODUCTION === 'true' ? true : false
        })
        res.status(200).json({
            success: true,
            data: req.__("Logout Success")
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("Logout Failed")
        })
    }
}

exports.checkAuth = async (req, res) => {
    try {
        if (req.user) {
            const user = await User.findById(req.user._id)
            return res.status(200).json({
                success: true,
                data: sanitizeUser(user)
            })
        }
        res.sendStatus(401)
    } catch (error) {
        console.log(error);
        res.sendStatus(500)
    }
}