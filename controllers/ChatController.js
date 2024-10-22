const ChatMessage = require("../models/ChatMessage");
const mongoose = require("mongoose");

    const sendMessage = async (req, res) => {
        const { message } = req.body;

        console.log("Dados recebidos:", req.body);
        console.log("Arquivos recebidos:", req.files);

        let imageUrl = null;
        let fileUrl = null;

        if (req.files) {
            if (req.files.image) {
                imageUrl = req.files.image[0].path;
                console.log("Imagem recebida:", imageUrl);
            }
            if (req.files.file) {
                fileUrl = req.files.file[0].path;
                console.log("Arquivo recebido:", fileUrl);
            }
        }

        try {
            const newMessage = await ChatMessage.create({
                userId: req.user.id,
                userName: req.user.name, 
                message: message || "",
                imageUrl: imageUrl,
                fileUrl: fileUrl,
                condominiumId: req.user.condominiumId, 
            });

            console.log("Mensagem criada com sucesso:", newMessage);

            res.status(201).json(newMessage);
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
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
