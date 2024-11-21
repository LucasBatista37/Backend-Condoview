const Reserve = require("../models/Reserve");
const mongoose = require("mongoose");

const createReserve = async (req, res) => {
  const { area, descricao, data, horarioInicio, horarioFim, nomeUsuario } = req.body;

  try {
    const newReserve = await Reserve.create({
      area,
      descricao,
      data,
      horarioInicio,
      horarioFim,
      nomeUsuario, 
      status: "Pendente",
    });

    res.status(201).json(newReserve);
  } catch (error) {
    res.status(500).json({
      errors: ["Houve um erro ao criar a reserva.", error.message],
    });
  }
};

const getReserves = async (req, res) => {
  try {
    const reserves = await Reserve.find(); 
    res.status(200).json(reserves);
  } catch (error) {
    res.status(500).json({ errors: ["Erro ao obter reservas."] });
  }
};

const updateReserve = async (req, res) => {
  const { id } = req.params;
  const { area, descricao, data, horarioInicio, horarioFim } = req.body;

  try {
    const reserve = await Reserve.findByIdAndUpdate(
      id,
      { area, descricao, data, horarioInicio, horarioFim },
      { new: true, runValidators: true }
    );

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    res.status(200).json(reserve);
  } catch (error) {
    res.status(422).json({ errors: ["Erro ao atualizar a reserva."] });
  }
};

const deleteReserve = async (req, res) => {
  const { id } = req.params;

  try {
    const reserve = await Reserve.findByIdAndDelete(
      new mongoose.Types.ObjectId(id)
    );

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    res.status(200).json({ message: "Reserva deletada com sucesso." });
  } catch (error) {
    res.status(500).json({ errors: ["Erro ao deletar a reserva."] });
  }
};

const approveReserve = async (req, res) => {
  const { id } = req.params;

  try {
    const reserve = await Reserve.findById(new mongoose.Types.ObjectId(id));

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    if (reserve.status === 'Aprovada') {
      return res.status(400).json({ errors: ["A reserva já foi aprovada."] });
    }

    reserve.status = 'Aprovada';  
    await reserve.save();

    res.status(200).json(reserve);
  } catch (error) {
    res.status(422).json({ errors: ["Erro ao aprovar a reserva."] });
  }
};

const rejectReserve = async (req, res) => {
  const { id } = req.params;

  try {
    const reserve = await Reserve.findById(new mongoose.Types.ObjectId(id));

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    if (reserve.status === 'Rejeitada') {
      return res.status(400).json({ errors: ["A reserva já foi rejeitada."] });
    }

    reserve.status = 'Rejeitada'; 
    await reserve.save();

    res.status(200).json(reserve);
  } catch (error) {
    res.status(422).json({ errors: ["Erro ao rejeitar a reserva."] });
  }
};

module.exports = {
  createReserve,
  getReserves,
  deleteReserve,
  approveReserve,
  rejectReserve,
  updateReserve,
};