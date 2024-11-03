const Notice = require("../models/Warning");
const mongoose = require("mongoose");

const createNotice = async (req, res) => {
    const { title, message, date } = req.body;

    console.log("Dados recebidos para criar aviso:", { title, message, date });

    try {
        const newNotice = await Notice.create({
            title,
            message,
            date,
            approved: false,
        });

        console.log("Novo aviso criado com sucesso:", newNotice);

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
    const { title, message, date,  } = req.body;

    try {
        const notice = await Notice.findByIdAndUpdate(
            id,
            { title, message, date,  },
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
