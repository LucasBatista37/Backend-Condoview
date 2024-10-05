const User = require('../models/User'); 
const Maintenance = require('../models/Maintenance'); 
const mongoose = require("mongoose");

const createMaintenance = async (req, res) => {
    const { type, descriptionMaintenance, dataMaintenance, imagePath } = req.body;
    
    const userId = req.user._id;

    try {
        const user = await User.findById(userId);
        console.log("Usuário encontrado:", user);

        if (!user || !user.condominium) {
            return res.status(400).json({ error: "Usuário não associado a um condomínio." });
        }

        const newMaintenance = await Maintenance.create({
            type,
            descriptionMaintenance,
            dataMaintenance,
            imagePath,
            approvedMaintenance: false, 
            condominiumId: user.condominium,
            userId: userId, 
        });

        res.status(201).json(newMaintenance);
    } catch (error) {
        console.error("Erro ao criar a manutenção:", error);
        res.status(500).json({ errors: ["Houve um erro ao criar a manutenção.", error.message] });
    }
};

const getMaintenances = async (req, res) => {
    try {
        const maintenances = await Maintenance.find();
        res.status(200).json(maintenances);
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao obter manutenções."] });
    }
};

const updateMaintenance = async (req, res) => {
    const { id } = req.params;
    const { type, descriptionMaintenance, dataMaintenance, imagePath } = req.body;

    try {
        const maintenance = await Maintenance.findByIdAndUpdate(
            id,
            { type, descriptionMaintenance, dataMaintenance, imagePath },
            { new: true, runValidators: true } 
        );

        if (!maintenance) {
            return res.status(404).json({ errors: ["Manutenção não encontrada."] });
        }

        res.status(200).json(maintenance);
    } catch (error) {
        res.status(422).json({ errors: ["Erro ao atualizar a manutenção."] });
    }
};

const deleteMaintenance = async (req, res) => {
    const { id } = req.params;

    try {
        const maintenance = await Maintenance.findByIdAndDelete(new mongoose.Types.ObjectId(id));

        if (!maintenance) {
            return res.status(404).json({ errors: ["Manutenção não encontrada."] });
        }

        res.status(200).json({ message: "Manutenção deletada com sucesso." });
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao deletar a manutenção."] });
    }
};

const approveMaintenance = async (req, res) => {
    const { id } = req.params;

    try {
        const maintenance = await Maintenance.findById(new mongoose.Types.ObjectId(id));

        if (!maintenance) {
            return res.status(404).json({ errors: ["Manutenção não encontrada."] });
        }

        if (maintenance.approvedMaintenance) {
            return res.status(400).json({ errors: ["A manutenção já foi aprovada."] });
        }

        maintenance.approvedMaintenance = true; 
        await maintenance.save();

        res.status(200).json(maintenance);
    } catch (error) {
        res.status(422).json({ errors: ["Erro ao aprovar a manutenção."] });
    }
};

const rejectMaintenance = async (req, res) => {
    const { id } = req.params;

    try {
        const maintenance = await Maintenance.findById(new mongoose.Types.ObjectId(id));

        if (!maintenance) {
            return res.status(404).json({ errors: ["Manutenção não encontrada."] });
        }

        if (maintenance.approvedMaintenance === false) {
            return res.status(400).json({ errors: ["A manutenção já foi rejeitada."] });
        }

        maintenance.approvedMaintenance = false; 
        await maintenance.save();

        res.status(200).json(maintenance);
    } catch (error) {
        res.status(422).json({ errors: ["Erro ao rejeitar a manutenção."] });
    }
};

module.exports = {
    createMaintenance,
    getMaintenances,
    deleteMaintenance,
    approveMaintenance,
    rejectMaintenance, 
    updateMaintenance,
};
