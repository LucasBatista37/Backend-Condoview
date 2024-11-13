const PersonalChatMessage = require("../models/PersonalChat");
const User = require("../models/User"); 
const mongoose = require("mongoose");

const sendPersonalMessage = async (req, res) => {
    const { receiver, message } = req.body;
    const sender = req.user._id;
    const image = req.file ? req.file.path : null;

    try {
        const newMessage = await PersonalChatMessage.create({
            sender,
            receiver,
            message,
            image,
        });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(422).json({ errors: ["Erro ao enviar a mensagem.", error.message] });
    }
};

const getPersonalMessages = async (req, res) => {
    const { userId } = req.params;
    const currentUser = req.user._id;

    try {
        const messages = await PersonalChatMessage.find({
            $or: [
                { sender: currentUser, receiver: userId },
                { sender: userId, receiver: currentUser }
            ]
        }).sort({ timestamp: 1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao obter mensagens pessoais."] });
    }
};

const deletePersonalMessage = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ errors: ["ID inválido."] });
    }

    try {
        const message = await PersonalChatMessage.findByIdAndDelete(id);

        if (!message) {
            return res.status(404).json({ errors: ["Mensagem não encontrada."] });
        }

        res.status(200).json({ message: "Mensagem deletada com sucesso." });
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao deletar a mensagem."] });
    }
};

module.exports = {
    sendPersonalMessage,
    getPersonalMessages,
    deletePersonalMessage,
};
