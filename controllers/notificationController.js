const User = require("../models/User");
const admin = require("../firebaseAdmin");

const sendNotification = async (req, res) => {
  const { userId, title, body } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user || !user.fcmToken) {
      return res.status(404).json({ error: "Usuário não encontrado ou sem FCM Token" });
    }

    const message = {
      token: user.fcmToken,
      notification: {
        title: title,
        body: body,
      },
    };

    await admin.messaging().send(message);
    res.status(200).json({ success: true, message: "Notificação enviada!" });
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    res.status(500).json({ error: "Erro ao enviar notificação." });
  }
};

module.exports = { sendNotification };
