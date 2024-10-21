const Maintenance = require("../models/Maintenance");
const mongoose = require("mongoose");

const createMaintenance = async (req, res) => {
  const { type, descriptionMaintenance, dataMaintenance } = req.body;

  try {
    const imagePath = req.file ? req.file.path : null;

    const newMaintenance = await Maintenance.create({
      type,
      descriptionMaintenance,
      dataMaintenance,
      imagePath, 
      status: "pendente", 
      // Removido userId e condominiumId
    });

    res.status(201).json(newMaintenance);
  } catch (error) {
    res.status(500).json({
      errors: ["Houve um erro ao criar a manutenção.", error.message],
    });
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
    const maintenance = await Maintenance.findByIdAndDelete(
      new mongoose.Types.ObjectId(id)
    );

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

        if (maintenance.status === 'aprovado') {
            return res.status(400).json({ errors: ["A manutenção já foi aprovada."] });
        }

        maintenance.status = 'aprovado';  
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

        if (maintenance.status === 'rejeitado') {
            return res.status(400).json({ errors: ["A manutenção já foi rejeitada."] });
        }

        maintenance.status = 'rejeitado'; 
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
