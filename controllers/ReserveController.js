const mongoose = require("mongoose");
const User = require("../models/User");
const Reserve = require("../models/Reserve");

const createReserve = async (req, res) => {
  const { area, descricao, data, hourStart, hourEnd } = req.body;

  const userId = req.user._id;

  console.log("ID do usuário autenticado:", userId);

  const user = await User.findById(userId);
  console.log("Usuário encontrado:", user);

  if (!user || !user.condominium) {
    return res.status(400).json({ error: "Usuário não associado a um condomínio." });
  }

  try {
    console.log("Dados recebidos para criação da reserva:", {
      area,
      descricao,
      data,
      hourStart,
      hourEnd,
      condominiumId: user.condominium,
      userId: userId,
    });

    const dateParsed = new Date(data);
    console.log("Data recebida:", data, "Data convertida:", dateParsed);

    if (isNaN(dateParsed.getTime())) {
      throw new Error("Data inválida.");
    }

    const newReserve = await Reserve.create({
      area,
      descricao,
      data: dateParsed,
      hourStart,
      hourEnd,
      status: "pendente",
      condominiumId: user.condominium,
      userId: userId,
    });

    console.log("Nova reserva criada com ID:", newReserve._id);

    return res.status(201).json(newReserve);
  } catch (error) {
    console.error("Erro ao criar a reserva:", error);

    return res.status(500).json({
      error: "Erro ao criar a reserva.",
      details: error.message,
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
  const { area, descricao, data, hourStart, hourEnd, status } = req.body;

  try {
    const reserve = await Reserve.findById(new mongoose.Types.ObjectId(id));

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    if (area) reserve.area = area;
    if (descricao) reserve.descricao = descricao;
    if (data) reserve.data = data;
    if (hourStart) reserve.hourStart = hourStart;
    if (hourEnd) reserve.hourEnd = hourEnd;
    if (status) reserve.status = status; 

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

    reserve.status = "aprovado"; 
    await reserve.save();

    res.status(200).json(reserve);
  } catch (error) {
    console.error(error); 
    res.status(422).json({ errors: ["Erro ao aprovar a reserva.", error.message] });
  }
};

const rejectReserve = async (req, res) => {
  const { id } = req.params;

  try {
    const reserve = await Reserve.findById(new mongoose.Types.ObjectId(id));

    if (!reserve) {
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    reserve.status = "rejeitado"; 
    await reserve.save();

    res.status(200).json(reserve);
  } catch (error) {
    console.error(error); 
    res.status(422).json({ errors: ["Erro ao rejeitar a reserva."] });
  }
};


module.exports = {
  createReserve,
  getReserves,
  getReserveById,
  updateReserve,
  deleteReserve,
  approveReserve,
  rejectReserve, 
};
