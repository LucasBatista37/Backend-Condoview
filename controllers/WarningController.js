const Notice = require("../models/Warning");
const User = require("../models/User"); 
const mongoose = require("mongoose");

const createNotice = async (req, res) => {
    const { title, message, date, imagePath } = req.body;
    const userId = req.user._id; 

    try {
        const user = await User.findById(userId);
        console.log("Usuário encontrado:", user);

        if (!user || !user.condominium) {
            return res.status(400).json({ error: "Usuário não associado a um condomínio." });
        }

        const newNotice = await Notice.create({
            title,
            message,
            date,
            imagePath,
            approved: false,
            userId: userId, 
            condominiumId: user.condominium,
        });

        res.status(201).json(newNotice);
    } catch (error) {
        console.error("Erro ao criar o aviso:", error);
        res.status(500).json({ errors: ["Houve um erro ao criar o aviso.", error.message] });
    }
};

const getNotices = async (req, res) => {
    try {
        const notices = await Notice.find();
        res.status(200).json(notices);
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao obter avisos."] });
    }
};

const updateNotice = async (req, res) => {
    const { id } = req.params;
    const { title, message, date, imagePath } = req.body;

    try {
        const notice = await Notice.findByIdAndUpdate(
            id,
            { title, message, date, imagePath },
            { new: true, runValidators: true }
        );

        if (!notice) {
            return res.status(404).json({ errors: ["Aviso não encontrado."] });
        }

        res.status(200).json(notice);
    } catch (error) {
        res.status(422).json({ errors: ["Erro ao atualizar o aviso."] });
    }
};

const deleteNotice = async (req, res) => {
    const { id } = req.params;

    try {
        const notice = await Notice.findByIdAndDelete(new mongoose.Types.ObjectId(id));

        if (!notice) {
            return res.status(404).json({ errors: ["Aviso não encontrado."] });
        }

        res.status(200).json({ message: "Aviso deletado com sucesso." });
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao deletar o aviso."] });
    }
};

module.exports = {
    createNotice,
    getNotices,
    deleteNotice,
    updateNotice,
};
