const ChatMessage = require("../models/ChatMessage");
const mongoose = require("mongoose");
const admin = require("../firebaseAdmin");
const User = require("../models/User");

const sendMessage = async (req, res) => {
  try {
    console.log("---- Início do envio de mensagem ----");
    console.log("Dados recebidos no corpo:", req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { message } = req.body;  
    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode ser vazia." });
    }

    const userId = req.user.id?.toString(); 
    const userName = req.user.nome || "Usuário desconhecido";

    console.log("ID do usuário:", userId);
    console.log("Nome do usuário:", userName);

    if (!userId) {
      return res.status(400).json({ error: "ID do usuário não encontrado." });
    }

    const newMessage = await ChatMessage.create({
      userId,
      userName,
      message,
    });

    console.log("Mensagem salva no banco:", newMessage);

    const participantes = await User.find({
      fcmToken: { $ne: null },
    });

    await Promise.all(participantes.map(async (user) => {
      if (!user.unreadMessages) {
        user.unreadMessages = new Map();
      }

      user.unreadMessages.set("general", (user.unreadMessages.get("general") || 0) + 1);
      await user.save();
    }));

    if (participantes.length > 0) {
      const tokens = participantes.map(user => user.fcmToken);

      const notification = {
        tokens: tokens,
        notification: {
          title: `${userName} enviou uma nova mensagem`,
          body: message,
        },
        data: {
          senderId: userId,
          senderName: userName,
          unreadCount: participantes.length.toString(),
        },
      };

      try {
        const response = await admin.messaging().sendEachForMulticast(notification);
        console.log("Resposta do Firebase:", response);
        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            console.error(`Erro ao enviar notificação para o token ${tokens[index]}:`, resp.error);
          }
        });
      } catch (error) {
        console.error("Erro geral ao enviar notificação:", error);
      }
    } else {
      console.log("Nenhum usuário para notificar.");
    }

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await User.updateOne(
      { _id: userId },
      { $unset: { [`unreadMessages.${conversationId}`]: 1 } }
    );

    const messages = await ChatMessage.find({ conversationId }).sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Erro ao obter mensagens:", error.message);
    res.status(500).json({ errors: ["Erro ao obter mensagens do chat."] });
  }
};

const deleteMessage = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ errors: ["ID inválido."] });
  }

  try {
    const message = await ChatMessage.findByIdAndDelete(id);

    if (!message) {
      return res.status(404).json({ errors: ["Mensagem não encontrada."] });
    }
    res.status(200).json({ message: "Mensagem deletada com sucesso." });
  } catch (error) {
    res.status(500).json({ errors: ["Erro ao deletar a mensagem."] });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  deleteMessage,
};
