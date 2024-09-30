const Reserve = require("../models/Reserve");
const mongoose = require("mongoose");

const createReserve = async (req, res) => {
    const { area, description, data, hourStart, hourEnd } = req.body;

    try {
        const newReserve = await Reserve.create({
            area,
            description,
            data,
            hourStart,
            hourEnd,
            approved: false, 
        });

        res.status(201).json(newReserve);
    } catch (error) {
        res.status(422).json({ errors: ["Houve um erro ao criar a reserva."] });
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
        const reserve = await Reserve.findByIdAndDelete(new mongoose.Types.ObjectId(id));

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
