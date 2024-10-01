const Ocorrencia = require('../models/Occurrence');

const criarOcorrencia = async (req, res) => {
    const { motivo, descricao, data } = req.body;
    const imagemPath = req.file ? req.file.path : null; 

    try {
        const novaOcorrencia = new Ocorrencia({
            motivo,
            descricao,
            data,
            imagemPath,
        });

        await novaOcorrencia.save();
        res.status(201).json(novaOcorrencia);
    } catch (error) {
        res.status(422).json({ errors: ['Erro ao criar a ocorrência.'] });
    }
};

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
