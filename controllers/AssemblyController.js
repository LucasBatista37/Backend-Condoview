const Assembly = require("../models/Assembly");
const mongoose = require("mongoose");

const createAssembly = async (req, res) => {
    const { title, description, date, imagePath } = req.body;

    try {
        const newAssembly = await Assembly.create({
            title,
            description,
            date,
            imagePath,
            approved: false,
        });

        res.status(201).json(newAssembly);
    } catch (error) {
        res.status(422).json({ errors: ["Houve um erro ao criar a assembleia."] });
    }
};

const getAssemblies = async (req, res) => {
    try {
        const assemblies = await Assembly.find();
        res.status(200).json(assemblies);
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao obter assembleias."] });
    }
};

const updateAssembly = async (req, res) => {
    const { id } = req.params;
    const { title, description, date, imagePath } = req.body;

    try {
        const assembly = await Assembly.findByIdAndUpdate(
            id,
            { title, description, date, imagePath },
            { new: true, runValidators: true }
        );

        if (!assembly) {
            return res.status(404).json({ errors: ["Assembleia não encontrada."] });
        }

        res.status(200).json(assembly);
    } catch (error) {
        res.status(422).json({ errors: ["Erro ao atualizar a assembleia."] });
    }
};

const deleteAssembly = async (req, res) => {
    const { id } = req.params;

    try {
        const assembly = await Assembly.findByIdAndDelete(new mongoose.Types.ObjectId(id));

        if (!assembly) {
            return res.status(404).json({ errors: ["Assembleia não encontrada."] });
        }

        res.status(200).json({ message: "Assembleia deletada com sucesso." });
    } catch (error) {
        res.status(500).json({ errors: ["Erro ao deletar a assembleia."] });
    }
};

module.exports = {
    createAssembly,
    getAssemblies,
    deleteAssembly,
    updateAssembly,
};
