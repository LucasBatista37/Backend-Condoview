const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const jwtSecret = process.env.JWT_SECRET;

const genereteToken = (id) => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: "7d",
  });
};

const register = async (req, res) => {
  const { nome, email, senha, role, condominium } = req.body;

  console.log("Dados recebidos para registro:", {
    nome,
    email,
    senha,
    role,
    condominium,
  });

  try {
    const user = await User.findOne({ email });

    if (user) {
      console.log("Usuário já existe:", email);
      res.status(422).json({ errors: ["Por favor, utilize outro e-mail"] });
      return;
    }

    const salt = await bcrypt.genSalt();
    console.log("Salt gerado:", salt);

    const passwordHash = await bcrypt.hash(senha, salt);
    console.log("Senha hasheada:", passwordHash);

    const newUser = await User.create({
      nome,
      email,
      senha: passwordHash,
      role: role || "morador",
      condominium: condominium || null,
    });

    if (!newUser) {
      console.log("Erro ao criar novo usuário");
      res.status(422).json({
        errors: "Houve um erro, por favor tente novamente mais tarde.",
      });
      return;
    }

    console.log("Novo usuário criado:", newUser);

    res.status(201).json({
      _id: newUser._id,
      token: genereteToken(newUser._id),
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.log("Usuário não encontrado:", email);
      res.status(404).json({ errors: ["Usuário não encontrado."] });
      return;
    }

    if (!(await bcrypt.compare(senha, user.senha))) {
      console.log("Senha inválida para usuário:", email);
      res.status(422).json({ erros: ["Senha inválida"] });
      return;
    }

    res.status(201).json({
      _id: user._id,
      profileImage: user.profileImage,
      token: genereteToken(user._id),
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const getCurrentUser = async (req, res) => {
  const user = req.user;

  res.status(200).json(user);
};

const update = async (req, res) => {
  const { nome, senha, telefone } = req.body;

  let profileImage = null;

  if (req.file) {
    profileImage = req.file.filename;
    console.log("Log: Arquivo recebido:", req.file);
    console.log("Log: Nome do arquivo salvo:", profileImage);
  }

  const reqUser = req.user;
  console.log("Log: Dados do usuário autenticado:", reqUser);

  try {
    const user = await User.findById(
      new mongoose.Types.ObjectId(reqUser._id)
    ).select("-senha");

    if (!user) {
      console.log("Log: Usuário não encontrado para ID:", reqUser._id);
      return res.status(404).json({ errors: ["Usuário não encontrado!"] });
    }

    console.log("Log: Usuário encontrado para atualização:", user);

    if (nome) {
      console.log("Log: Atualizando nome:", nome);
      user.nome = nome;
    }

    if (senha) {
      console.log("Log: Atualizando senha...");
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(senha, salt);
      user.senha = passwordHash;
      console.log("Log: Senha hasheada com sucesso");
    }

    if (profileImage) {
      console.log("Log: Atualizando imagem de perfil:", profileImage);
      user.profileImage = profileImage;
    }

    if (telefone) {
      console.log("Log: Atualizando telefone:", telefone);
      user.telefone = telefone;
    }

    await user.save();
    console.log("Log: Usuário atualizado com sucesso:", user);

    res.status(200).json(user);
  } catch (error) {
    console.error("Erro na atualização do usuário:", error);
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log("ID inválido:", id);
    return res.status(400).json({ errors: ["ID inválido fornecido."] });
  }

  try {
    const user = await User.findById(new mongoose.Types.ObjectId(id)).select(
      "-senha"
    );

    if (!user) {
      console.log("Usuário não encontrado para o ID:", id);
      return res.status(404).json({ errors: ["Usuário não encontrado!"] });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao buscar usuário por ID:", error);
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-senha");

    if (!users || users.length === 0) {
      console.log("Nenhum usuário encontrado");
      return res.status(404).json({ errors: ["Nenhum usuário encontrado!"] });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao buscar todos os usuários:", error);
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log("ID inválido:", id);
    return res.status(400).json({ errors: ["ID inválido fornecido."] });
  }

  try {
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      console.log("Usuário não encontrado para exclusão:", id);
      return res.status(404).json({ errors: ["Usuário não encontrado!"] });
    }

    res.status(200).json({ message: "Usuário excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const saveFcmToken = async (req, res) => {
  const { userId, fcmToken } = req.body;

  if (!userId || !fcmToken) {
    return res.status(400).json({ error: "User ID e FCM Token são obrigatórios." });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true, upsert: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.status(200).json({ success: true, message: "FCM Token atualizado!", user });
  } catch (error) {
    console.error("Erro ao salvar FCM Token:", error);
    res.status(500).json({ error: "Erro ao salvar FCM Token." });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  update,
  getUserById,
  getAllUsers,
  deleteUser,
  saveFcmToken,
};
