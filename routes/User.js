const express = require("express")
const userController = require("../controllers/User")
const { verifyToken } = require("../middleware/VerifyToken")
const router = express.Router()

router
    .get("/me", verifyToken, userController.getMe)
    .get("/:id", userController.getById)
    .patch("/:id", userController.updateById)

module.exports = router