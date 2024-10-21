const Package = require('../models/Package');

const addPackage = async (req, res) => {
    const { title, apartment, time, imagePath, type } = req.body;

    try {
        const newPackage = new Package({
            title,
            apartment,
            time,
            imagePath,
            type,
            // Removendo userId e condominiumId
        });

        await newPackage.save();

        return res.status(201).json({ message: 'Encomenda adicionada com sucesso', newPackage });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao adicionar encomenda', error: error.message });
    }
};

const getPackages = async (req, res) => {
    try {
        const packages = await Package.find();
        return res.status(200).json(packages);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar encomendas', error: error.message });
    }
};

const getPackageById = async (req, res) => {
    const { id } = req.params;

    try {
        const package = await Package.findById(id);
        if (!package) {
            return res.status(404).json({ message: 'Encomenda não encontrada' });
        }
        return res.status(200).json(package);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao obter encomenda', error: error.message });
    }
};

const updatePackage = async (req, res) => {
    const { id } = req.params;
    const { title, apartment, time, imagePath, type } = req.body;

    try {
        const updatedPackage = await Package.findByIdAndUpdate(id, { title, apartment, time, imagePath, type }, { new: true });
        if (!updatedPackage) {
            return res.status(404).json({ message: 'Encomenda não encontrada' });
        }
        return res.status(200).json({ message: 'Encomenda atualizada com sucesso', updatedPackage });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar encomenda', error: error.message });
    }
};

const deletePackage = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedPackage = await Package.findByIdAndDelete(id);
        if (!deletedPackage) {
            return res.status(404).json({ message: 'Encomenda não encontrada' });
        }
        return res.status(200).json({ message: 'Encomenda deletada com sucesso' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao deletar encomenda', error: error.message });
    }
};

module.exports = {
    addPackage,
    getPackages,
    getPackageById,
    updatePackage,
    deletePackage,
};
    