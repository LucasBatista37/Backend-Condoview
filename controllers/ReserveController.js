const mongoose = require("mongoose");
const User = require("../models/User");
const Reserve = require("../models/Reserve");

const createReserve = async (req, res) => {
  const { area, description, data, hourStart, hourEnd } = req.body;

  const userId = req.user._id;

  const user = await User.findById(userId);
  console.log("Usuário encontrado:", user);

  if (!user || !user.condominium) {
    return res
      .status(400)
      .json({ error: "Usuário não associado a um condomínio." });
  }

  try {
    const newReserve = await Reserve.create({
      area,
      description,
      data,
      hourStart,
      hourEnd,
      approved: false,
      condominiumId: user.condominium,
      userId: userId,
    });

    return res.status(201).json(newReserve);
  } catch (error) {
    console.error("Erro ao criar a reserva:", error);
    return res
      .status(500)
      .json({ error: "Erro ao criar a reserva.", details: error.message });
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

const getReserveById = async (req, res) => {
  const { id } = req.params;

  try {
    const reserve = await Reserve.findById(new mongoose.Types.ObjectId(id));

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    res.status(200).json(reserve);
  } catch (error) {
    res.status(404).json({ errors: ["Reserva não encontrada."] });
  }
};

const updateReserve = async (req, res) => {
  const { id } = req.params;
  const { area, description, data, hourStart, hourEnd, approved } = req.body;

  try {
    const reserve = await Reserve.findById(new mongoose.Types.ObjectId(id));

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    if (area) reserve.area = area;
    if (description) reserve.description = description;
    if (data) reserve.data = data;
    if (hourStart) reserve.hourStart = hourStart;
    if (hourEnd) reserve.hourEnd = hourEnd;
    if (approved !== undefined) reserve.approved = approved;

    await reserve.save();

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

    reserve.approved = true;
    await reserve.save();

    res.status(200).json(reserve);
  } catch (error) {
    res.status(422).json({ errors: ["Erro ao aprovar a reserva."] });
  }
};

module.exports = {
  createReserve,
  getReserves,
  getReserveById,
  updateReserve,
  deleteReserve,
  approveReserve,
};
