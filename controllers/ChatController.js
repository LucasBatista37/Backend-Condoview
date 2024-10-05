const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");
const mongoose = require("mongoose");

const sendMessage = async (req, res) => {
    const { message } = req.body;
    const { user } = req;

    let imageUrl = null;
    let fileUrl = null;

    if (req.files) {
        if (req.files.image) {
            imageUrl = req.files.image[0].path;
        }
        if (req.files.file) {
            fileUrl = req.files.file[0].path;
        }
    }

    try {
        const currentUser = await User.findById(user.id);
        if (!currentUser || !currentUser.condominium) {
            return res.status(400).json({ error: "Usuário não associado a um condomínio." });
        }

        const newMessage = await ChatMessage.create({
            userId: user.id,
            userName: user.name,
            message: message || "",
            imageUrl: imageUrl,
            fileUrl: fileUrl,
            condominiumId: currentUser.condominium,
        });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao enviar a mensagem.", error.message] });
    }
};

const getMessages = async (req, res) => {
    try {
        const messages = await ChatMessage.find().sort({ timestamp: 1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao obter mensagens do chat."] });
    }
};

const deleteMessage = async (req, res) => {
    const { id } = req.params;

    console.log("ID recebido:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log("ID inválido");
        return res.status(400).json({ errors: ["ID inválido."] });
    }

    try {
        console.log("Tentando deletar a mensagem com ID:", id);

        const message = await ChatMessage.findByIdAndDelete(new mongoose.Types.ObjectId(id));

        if (!message) {
            console.log("Mensagem não encontrada para o ID:", id);
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
