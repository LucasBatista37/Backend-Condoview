const Notice = require("../models/Warning");
const mongoose = require("mongoose");

const createNotice = async (req, res) => {
    const { title, message, date } = req.body;
    const userCondominium = req.user.condominium;

    console.log("Dados recebidos para criar aviso:", { title, message, date });

    try {
        const newNotice = await Notice.create({
            title,
            message,
            date,
            approved: false,
            condominium: userCondominium,
        });

        console.log("Novo aviso criado com sucesso:", newNotice);

        res.status(201).json(newNotice);
    } catch (error) {
        console.error("Erro ao criar o aviso:", error);
        res.status(500).json({ errors: ["Houve um erro ao criar o aviso.", error.message] });
    }
};

const getNotices = async (req, res) => {
    const userCondominium = req.user.condominium; 

    try {
        const notices = await Notice.find({ condominium: userCondominium });
        res.status(200).json(notices);
    } catch (error) {
        console.error("Erro ao obter avisos:", error);
        res.status(500).json({ errors: ["Erro ao obter avisos."] });
    }
};

const updateNotice = async (req, res) => {
    const { id } = req.params;
    const { title, message, date } = req.body;
    const userCondominium = req.user.condominium;

    try {
        const notice = await Notice.findOne({ _id: id, condominium: userCondominium });

        if (!notice) {
            return res.status(404).json({ errors: ["Aviso não encontrado ou não pertence ao seu condomínio."] });
        }

        const updatedNotice = await Notice.findByIdAndUpdate(
            id,
            { title, message, date },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedNotice);
    } catch (error) {
        console.error("Erro ao atualizar o aviso:", error);
        res.status(422).json({ errors: ["Erro ao atualizar o aviso.", error.message] });
    }
};

const deleteNotice = async (req, res) => {
    const { id } = req.params;
    const userCondominium = req.user.condominium;

    try {
        const notice = await Notice.findOne({ _id: id, condominium: userCondominium });

        if (!notice) {
            return res.status(404).json({ errors: ["Aviso não encontrado ou não pertence ao seu condomínio."] });
        }

        await Notice.findByIdAndDelete(id);

        res.status(200).json({ message: "Aviso deletado com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar o aviso:", error);
        res.status(500).json({ errors: ["Erro ao deletar o aviso.", error.message] });
    }
};

module.exports = {
    createNotice,
    getNotices,
    deleteNotice,
    updateNotice,
};