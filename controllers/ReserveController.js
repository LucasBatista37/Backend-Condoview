const mongoose = require("mongoose");
const Reserve = require("../models/Reserve");
const { isValidObjectId } = require("mongoose"); // Certifique-se de que isso está importado

const createReserve = async (req, res) => {
  const { area, descricao, data, hourStart, hourEnd } = req.body;

  try {
    const dateParsed = new Date(data);
    console.log("Data recebida:", data, "Data convertida:", dateParsed);

    if (isNaN(dateParsed.getTime())) {
      console.error("Erro: Data inválida.");
      throw new Error("Data inválida.");
    }

    const newReserve = await Reserve.create({
      area,
      descricao,
      data: dateParsed,
      hourStart,
      hourEnd,
      status: "pendente",
    });

    console.log("Nova reserva criada com ID:", newReserve._id);

    return res.status(201).json(newReserve);
  } catch (error) {
    console.error("Erro ao criar a reserva:", error.message);

    return res.status(500).json({
      error: "Erro ao criar a reserva.",
      details: error.message,
    });
  }
};

const getReserves = async (req, res) => {
  try {
    const reserves = await Reserve.find();
    console.log("Reservas obtidas:", reserves.length);
    res.status(200).json(reserves);
  } catch (error) {
    console.error("Erro ao obter reservas:", error.message);
    res.status(500).json({ errors: ["Erro ao obter reservas."] });
  }
};

const getReserveById = async (req, res) => {
  const { id } = req.params;

  // Validação do ID
  if (!isValidObjectId(id)) {
    console.error("Erro: ID inválido:", id);
    return res.status(400).json({ errors: ["ID inválido."] });
  }

  try {
    const reserve = await Reserve.findById(id);

    if (!reserve) {
      console.warn("Reserva não encontrada para ID:", id);
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    console.log("Reserva encontrada:", reserve);
    res.status(200).json(reserve);
  } catch (error) {
    console.error("Erro ao buscar a reserva:", error.message);
    res.status(500).json({ errors: ["Erro ao buscar a reserva."] });
  }
};

const updateReserve = async (req, res) => {
  const { id } = req.params;

  // Validação do ID
  if (!isValidObjectId(id)) {
    console.error("Erro: ID inválido:", id);
    return res.status(400).json({ errors: ["ID inválido."] });
  }

  const { area, descricao, data, hourStart, hourEnd, status } = req.body;

  try {
    const reserve = await Reserve.findById(id);

    if (!reserve) {
      console.warn("Reserva não encontrada para ID:", id);
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    // Atualizar campos apenas se foram fornecidos
    if (area) {
      reserve.area = area;
      console.log("Campo 'area' atualizado:", area);
    }
    if (descricao) {
      reserve.descricao = descricao;
      console.log("Campo 'descricao' atualizado:", descricao);
    }
    if (data) {
      reserve.data = new Date(data);
      console.log("Campo 'data' atualizado:", reserve.data);
    }
    if (hourStart) {
      reserve.hourStart = hourStart;
      console.log("Campo 'hourStart' atualizado:", hourStart);
    }
    if (hourEnd) {
      reserve.hourEnd = hourEnd;
      console.log("Campo 'hourEnd' atualizado:", hourEnd);
    }
    if (status) {
      reserve.status = status;
      console.log("Campo 'status' atualizado:", status);
    }

    await reserve.save();
    console.log("Reserva atualizada com ID:", reserve._id);

    res.status(200).json(reserve);
  } catch (error) {
    console.error("Erro ao atualizar a reserva:", error.message);
    res.status(422).json({ errors: ["Erro ao atualizar a reserva."] });
  }
};

const deleteReserve = async (req, res) => {
  const { id } = req.params;

  // Validação do ID
  if (!isValidObjectId(id)) {
    console.error("Erro: ID inválido:", id);
    return res.status(400).json({ errors: ["ID inválido."] });
  }

  try {
    const reserve = await Reserve.findByIdAndDelete(id);

    if (!reserve) {
      console.warn("Reserva não encontrada para ID:", id);
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    console.log("Reserva deletada com ID:", id);
    res.status(200).json({ message: "Reserva deletada com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar a reserva:", error.message);
    res.status(500).json({ errors: ["Erro ao deletar a reserva."] });
  }
};

const approveReserve = async (req, res) => {
  const { id } = req.params;

  // Validação do ID
  if (!isValidObjectId(id)) {
    console.error("Erro: ID inválido:", id);
    return res.status(400).json({ errors: ["ID inválido."] });
  }

  try {
    const reserve = await Reserve.findById(id);

    if (!reserve) {
      console.warn("Reserva não encontrada para ID:", id);
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    reserve.status = "aprovado"; 
    await reserve.save();

    console.log("Reserva aprovada com ID:", reserve._id);
    res.status(200).json(reserve);
  } catch (error) {
    console.error("Erro ao aprovar a reserva:", error.message);
    res.status(422).json({ errors: ["Erro ao aprovar a reserva.", error.message] });
  }
};

const rejectReserve = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    console.error("Erro: ID inválido:", id);
    return res.status(400).json({ errors: ["ID inválido."] });
  }

  try {
    const reserve = await Reserve.findById(id);

    if (!reserve) {
      console.warn("Reserva não encontrada para ID:", id);
      return res.status(404).json({ errors: ["Reserva não encontrada."] });
    }

    reserve.status = "rejeitado"; 
    await reserve.save();

    console.log("Reserva rejeitada com ID:", reserve._id);
    res.status(200).json(reserve);
  } catch (error) {
    console.error("Erro ao rejeitar a reserva:", error.message);
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
