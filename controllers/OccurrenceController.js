const mongoose = require("mongoose");
const User = require("../models/User");
const Occurrence = require("../models/Occurrence");
const admin = require("../firebaseAdmin");

async function criarOcorrencia(req, res) {
  try {
    console.log("Dados recebidos:", req.body);
    console.log("Arquivo recebido:", req.file);

    if (!req.body.motivo || !req.body.descricao || !req.body.data) {
      console.warn("Campos obrigatórios faltando:", {
        motivo: req.body.motivo,
        descricao: req.body.descricao,
        data: req.body.data,
      });
      return res
        .status(400)
        .json({ error: "Motivo, descrição e data são obrigatórios." });
    }

    const novaOcorrencia = new Occurrence({
      motivo: req.body.motivo,
      descricao: req.body.descricao,
      data: req.body.data,
      imagemPath: req.file ? req.file.path : null,
    });

    console.log("Nova ocorrência a ser salva:", novaOcorrencia);
    await novaOcorrencia.save();
    console.log("Ocorrência criada com sucesso:", novaOcorrencia);

    const admins = await User.find({ role: "administrador", fcmToken: { $ne: null } });

    if (admins.length > 0) {
      const tokens = admins.map(admin => admin.fcmToken);

      const notification = {
        tokens: tokens,
        notification: {
          title: "Nova Ocorrência",
          body: `Motivo: ${req.body.motivo}`,
        },
      };

      admin.messaging().sendEachForMulticast(notification)
        .then(response => {
          console.log("Notificação enviada com sucesso:", response);
        })
        .catch(error => {
          console.error("Erro ao enviar notificação:", error);
        });
    }

    return res.status(201).json(novaOcorrencia);
  } catch (error) {
    console.error("Erro ao criar a ocorrência:", error);
    return res
      .status(500)
      .json({ error: "Erro ao criar a ocorrência.", details: error.message });
  }
}

const obterOcorrencias = async (req, res) => {
  try {
    const ocorrencias = await Occurrence.find();
    res.status(200).json(ocorrencias);
  } catch (error) {
    res.status(500).json({ errors: ["Erro ao obter ocorrências."] });
  }
  console.log("Arquivo recebido:", req.file);
};

const atualizarOcorrencia = async (req, res) => {
  const { id } = req.params;
  const { motivo, descricao, data } = req.body;
  const imagemPath = req.file ? req.file.path : null;

  try {
    const ocorrencia = await Occurrence.findByIdAndUpdate(
      id,
      { motivo, descricao, data, imagemPath },
      { new: true, runValidators: true }
    );

    if (!ocorrencia) {
      return res.status(404).json({ errors: ["Ocorrência não encontrada."] });
    }

    res.status(200).json(ocorrencia);
  } catch (error) {
    res.status(422).json({ errors: ["Erro ao atualizar a ocorrência."] });
  }
};

const deletarOcorrencia = async (req, res) => {
  const { id } = req.params;

  try {
    const ocorrencia = await Occurrence.findByIdAndDelete(id);

    if (!ocorrencia) {
      return res.status(404).json({ errors: ["Ocorrência não encontrada."] });
    }

    res.status(200).json({ message: "Ocorrência deletada com sucesso." });
  } catch (error) {
    res.status(500).json({ errors: ["Erro ao deletar a ocorrência."] });
  }
};

module.exports = {
  criarOcorrencia,
  obterOcorrencias,
  atualizarOcorrencia,
  deletarOcorrencia,
};
