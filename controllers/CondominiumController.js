const Condominium = require("../models/Condominium");
const mongoose = require("mongoose");

const createCondominium = async (req, res) => {
  try {
    const { name, address, cnpj, units, foundationDate, contactPhone, contactEmail, blocks, parkingSpots, rules } = req.body;

    const existingCondo = await Condominium.findOne({ cnpj });
    if (existingCondo) {
      return res.status(422).json({ errors: ["CNPJ já cadastrado."] });
    }

    const newCondominium = await Condominium.create({
      name,
      address,
      cnpj,
      units,
      foundationDate,
      contactPhone,
      contactEmail,
      blocks,
      parkingSpots,
      rules,
    });

    if (!newCondominium) {
      return res.status(500).json({ errors: ["Não foi possível criar o condomínio. Por favor, tente novamente."] });
    }

    res.status(201).json(newCondominium);
  } catch (error) {
    console.error("Erro ao criar condomínio:", error.message);
    res.status(500).json({ errors: ["Ocorreu um erro no servidor. Por favor, tente novamente mais tarde."] });
  }
};


module.exports = {
  createCondominium,
};
