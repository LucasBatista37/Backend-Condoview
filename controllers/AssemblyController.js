const User = require("../models/User");
const Assembly = require("../models/Assembly");
const admin = require("../firebaseAdmin");
const mongoose = require("mongoose");

const createAssembly = async (req, res) => {
  const { title, description, date } = req.body;

  try {
    const currentDateTime = new Date();
    let status = "Pendente";

    if (new Date(date) < currentDateTime) {
      status = "Encerrada";
    } else if (new Date(date) === currentDateTime) {
      status = "Em Andamento";
    }

    const newAssembly = await Assembly.create({
      title,
      description,
      date,
      status,
    });

    console.log("Nova assembleia criada com sucesso:", newAssembly);

    const moradores = await User.find({
      role: "morador",
      fcmToken: { $ne: null },
    });

    if (moradores.length > 0) {
      const tokens = moradores.map((morador) => morador.fcmToken);

      const notification = {
        tokens: tokens,
        notification: {
          title: "Nova Assembleia Criada",
          body: `"${title}". Descrição: ${description}`,
        },
      };

      admin
        .messaging()
        .sendEachForMulticast(notification)
        .then((response) => {
          console.log("Notificação enviada com sucesso:", response);
        })
        .catch((error) => {
          console.error("Erro ao enviar notificação:", error);
        });
    } else {
      console.warn("Nenhum morador encontrado com FCM Token.");
    }

    return res.status(201).json(newAssembly);
  } catch (error) {
    console.error("Erro ao criar a assembleia:", error);
    return res.status(500).json({
      errors: ["Houve um erro ao criar a assembleia.", error.message],
    });
  }
};

const getAssemblies = async (req, res) => {
  try {
    const assemblies = await Assembly.find();

    const currentDateTime = new Date();
    assemblies.forEach((assembly) => {
      if (new Date(assembly.date) < currentDateTime) {
        assembly.status = "Encerrada";
      } else if (new Date(assembly.date) > currentDateTime) {
        assembly.status = "Pendente";
      } else {
        assembly.status = "Em Andamento";
      }
    });

    res.status(200).json(assemblies);
  } catch (error) {
    console.error("Erro ao buscar assembleias:", error);
    res.status(500).json({
      errors: ["Houve um erro ao buscar assembleias.", error.message],
    });
  }
};

const updateAssembly = async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;

  try {
    const assembly = await Assembly.findByIdAndUpdate(
      id,
      { title, description, date },
      { new: true, runValidators: true }
    );

    if (!assembly) {
      return res.status(404).json({ errors: ["Assembleia não encontrada."] });
    }

    res.status(200).json(assembly);
  } catch (error) {
    res.status(422).json({ errors: ["Erro ao atualizar a assembleia."] });
  }
};

const deleteAssembly = async (req, res) => {
  const { id } = req.params;

  try {
    const assembly = await Assembly.findByIdAndDelete(
      new mongoose.Types.ObjectId(id)
    );

    if (!assembly) {
      return res.status(404).json({ errors: ["Assembleia não encontrada."] });
    }

    res.status(200).json({ message: "Assembleia deletada com sucesso." });
  } catch (error) {
    res.status(500).json({ errors: ["Erro ao deletar a assembleia."] });
  }
};

module.exports = {
  createAssembly,
  getAssemblies,
  deleteAssembly,
  updateAssembly,
};
