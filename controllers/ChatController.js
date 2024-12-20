const ChatMessage = require("../models/ChatMessage");
const mongoose = require("mongoose");

const sendMessage = async (req, res) => {
  const { message } = req.body;

  console.log("---- Início do envio de mensagem ----");
  console.log("Dados recebidos no corpo:", req.body);
  console.log("Arquivos recebidos no 'req.files':", req.files);

  let imageUrl = null;
  let fileUrl = null;

  if (req.files) {
    console.log("Arquivos estão presentes no 'req.files'.");

    if (req.files.image && req.files.image.length > 0) {
      imageUrl = req.files.image[0].path;
      console.log("Caminho da imagem recebido:", imageUrl);
    } else {
      console.log("Nenhuma imagem foi recebida no campo 'image'.");
    }

    if (req.files.file && req.files.file.length > 0) {
      fileUrl = req.files.file[0].path;
      console.log("Caminho do arquivo recebido:", fileUrl);
    } else {
      console.log("Nenhum arquivo foi recebido no campo 'file'.");
    }
  } else {
    console.log("Nenhum arquivo foi recebido no 'req.files'.");
  }

  try {
    const userId = req.user.id;
    const userName = req.user.nome;

    console.log("ID do usuário:", userId);
    console.log("Nome do usuário:", userName);

    const newMessage = await ChatMessage.create({
      userId: userId, 
      userName: userName,
      message: message || "",
      imageUrl: imageUrl,
      fileUrl: fileUrl,
    });

    console.log("Mensagem criada com sucesso no banco de dados:", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erro ao enviar a mensagem:", error);
    res
      .status(500)
      .json({ errors: ["Erro ao enviar a mensagem.", error.message] });
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
