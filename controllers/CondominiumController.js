const Condominium = require("../models/Condominium");
const mongoose = require("mongoose");

const createCondominium = async (req, res) => {
  try {
    const { name, address, cnpj, email, phone, description } = req.body;

    const existingCondo = await Condominium.findOne({ cnpj });
    if (existingCondo) {
      return res.status(422).json({ errors: ["CNPJ já cadastrado."] });
    }

    const newCondominium = await Condominium.create({
      name,
      address,
      cnpj,
      email,
      phone,
      description,
    });

    res.status(201).json(newCondominium);
  } catch (error) {
    console.error("Erro ao criar condomínio:", error.message);
    res.status(500).json({
      errors: [
        "Não foi possível criar o condomínio. Verifique os dados enviados e tente novamente.",
      ],
    });
  }
};


const editCondominium = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, cnpj, email, phone, description } = req.body;

    const updatedCondo = await Condominium.findByIdAndUpdate(
      id,
      { name, address, cnpj, email, phone, description },
      { new: true, runValidators: true } 
    );

    if (!updatedCondo) {
      return res.status(404).json({ errors: ["Condomínio não encontrado."] });
    }

    res.status(200).json(updatedCondo);
  } catch (error) {
    console.error("Erro ao editar condomínio:", error.message);
    res
      .status(500)
      .json({ errors: ["Erro no servidor. Por favor, tente novamente."] });
  }
};

const deleteCondominium = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCondo = await Condominium.findByIdAndDelete(id);

    if (!deletedCondo) {
      return res.status(404).json({ errors: ["Condomínio não encontrado."] });
    }

    res.status(200).json({ message: "Condomínio excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir condomínio:", error.message);
    res
      .status(500)
      .json({ errors: ["Erro no servidor. Por favor, tente novamente."] });
  }
};

module.exports = {
  createCondominium,
  editCondominium,
  deleteCondominium,
};
