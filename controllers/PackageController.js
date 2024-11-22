const Package = require("../models/Package");

const path = require("path");

const addPackage = async (req, res) => {
  const { title, apartment, time, type, usuarioId } = req.body;

  const imagePath = req.file ? path.basename(req.file.path) : "";

  console.log("Recebido para adicionar pacote:", {
    title,
    apartment,
    time,
    imagePath,
    type,
    usuarioId,
  });

  try {
    const status = type === "Entregue" ? "Entregue" : "Pendente";

    const newPackage = new Package({
      title,
      apartment,
      time,
      imagePath,
      type,
      status,
      usuarioId,
    });

    console.log("Novo pacote criado antes de salvar:", newPackage);

    await newPackage.save();

    console.log("Pacote salvo no banco de dados:", newPackage);

    return res
      .status(201)
      .json({ message: "Encomenda adicionada com sucesso", newPackage });
  } catch (error) {
    console.error("Erro ao adicionar encomenda:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao adicionar encomenda", error: error.message });
  }
};

const getPackages = async (req, res) => {
  try {
    const packages = await Package.find();
    return res.status(200).json(packages);
  } catch (error) {
    console.error("Erro ao listar encomendas:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao listar encomendas", error: error.message });
  }
};

const getPackageById = async (req, res) => {
  const { id } = req.params;

  try {
    const package = await Package.findById(id);
    if (!package) {
      return res.status(404).json({ message: "Encomenda não encontrada" });
    }
    return res.status(200).json(package);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erro ao obter encomenda", error: error.message });
  }
};

const updatePackage = async (req, res) => {
  const { id } = req.params;
  const { title, apartment, time, imagePath, type } = req.body;

  console.log("Recebido para atualizar pacote. ID:", id, "Dados:", {
    title,
    apartment,
    time,
    imagePath,
    type,
  });

  try {
    const status = type === "Entregue" ? "Entregue" : "Pendente";

    const updatedPackage = await Package.findByIdAndUpdate(
      id,
      {
        title,
        apartment,
        time,
        imagePath,
        type,
        status,
      },
      { new: true }
    );

    if (!updatedPackage) {
      console.warn("Pacote não encontrado com o ID:", id);
      return res.status(404).json({ message: "Encomenda não encontrada" });
    }

    console.log("Pacote atualizado com sucesso:", updatedPackage);
    return res
      .status(200)
      .json({ message: "Encomenda atualizada com sucesso", updatedPackage });
  } catch (error) {
    console.error("Erro ao atualizar encomenda:", error.message);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar encomenda", error: error.message });
  }
};

const deletePackage = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPackage = await Package.findByIdAndDelete(id);
    if (!deletedPackage) {
      return res.status(404).json({ message: "Encomenda não encontrada" });
    }
    return res.status(200).json({ message: "Encomenda deletada com sucesso" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erro ao deletar encomenda", error: error.message });
  }
};

module.exports = {
  addPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
};
