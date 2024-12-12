const User = require("../models/User")

exports.getById = async (req, res) => {
    try {
        const { id } = req.params
        const result = await User.findById(id, { password: false })
        res.status(200).json({
            success: true,
            data: result
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("User Getting Details Error")
        })
    }
}
exports.updateById = async (req, res) => {
    try {
        const { id } = req.params
        const updated = (await User.findByIdAndUpdate(id, req.body, { new: true })).toObject()
        delete updated.password
        res.status(200).json({
            success: true,
            data: updated
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: req.__("User Getting Details Error")
        })
    }
}