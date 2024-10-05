const mongoose = require("mongoose");
const User = require("../models/User"); 
const Occurrence = require("../models/Occurrence"); 

async function criarOcorrencia(req, res) {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId);
        console.log('Usuário encontrado:', user); 

        if (!user || !user.condominium) {
            return res.status(400).json({ error: 'Usuário não associado a um condomínio.' });
        }

        const novaOcorrencia = new Occurrence({
            motivo: req.body.motivo,
            descricao: req.body.descricao,
            data: req.body.data,
            imagemPath: req.body.imagemPath,
            condominiumId: user.condominium,
            userId: userId 
        });

        await novaOcorrencia.save();
        return res.status(201).json(novaOcorrencia);
    } catch (error) {
        console.error('Erro ao criar a ocorrência:', error);
        return res.status(500).json({ error: 'Erro ao criar a ocorrência.', details: error.message });
    }
}

const obterOcorrencias = async (req, res) => {
    try {
        const ocorrencias = await Ocorrencia.find();
        res.status(200).json(ocorrencias);
    } catch (error) {
        res.status(500).json({ errors: ['Erro ao obter ocorrências.'] });
    }
};

const atualizarOcorrencia = async (req, res) => {
    const { id } = req.params;
    const { motivo, descricao, data } = req.body;
    const imagemPath = req.file ? req.file.path : null;

    try {
        const ocorrencia = await Ocorrencia.findByIdAndUpdate(
            id,
            { motivo, descricao, data, imagemPath },
            { new: true, runValidators: true }
        );

        if (!ocorrencia) {
            return res.status(404).json({ errors: ['Ocorrência não encontrada.'] });
        }

        res.status(200).json(ocorrencia);
    } catch (error) {
        res.status(422).json({ errors: ['Erro ao atualizar a ocorrência.'] });
    }
};

const deletarOcorrencia = async (req, res) => {
    const { id } = req.params;

    try {
        const ocorrencia = await Ocorrencia.findByIdAndDelete(id);

        if (!ocorrencia) {
            return res.status(404).json({ errors: ['Ocorrência não encontrada.'] });
        }

        res.status(200).json({ message: 'Ocorrência deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ errors: ['Erro ao deletar a ocorrência.'] });
    }
};

module.exports = {
    criarOcorrencia,
    obterOcorrencias,
    atualizarOcorrencia,
    deletarOcorrencia,
};
