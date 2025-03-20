const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const jwtSecret = process.env.JWT_SECRET;
const emailUser = process.env.EMAIL_USER; 
const emailPass = process.env.EMAIL_PASS; 

const generateVerificationToken = (id) => {
  return jwt.sign({ id }, jwtSecret, { expiresIn: "24h" });
};

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

const genereteToken = (id) => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: "7d",
  });
};

const register = async (req, res) => {
  const { nome, email, senha, role, condominium } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user) {
      return res.status(422).json({ errors: ["Por favor, utilize outro e-mail"] });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(senha, salt);

    const newUser = await User.create({
      nome,
      email,
      senha: passwordHash,
      role: role || "morador",
      condominium: condominium || null,
      isVerified: false, 
    });

    const verificationToken = generateVerificationToken(newUser._id);

    const verificationLink = `http://localhost:5000/api/users/verify/${verificationToken}`;

    await transporter.sendMail({
      from: `"Condoview" <${emailUser}>`,
      to: newUser.email,
      subject: "Verifique seu e-mail",
      html: `<p>Olá, ${newUser.nome}, clique no link abaixo para verificar sua conta:</p>
             <a href="${verificationLink}">Verificar Conta</a>`,
    });

    res.status(201).json({
      message: "Usuário cadastrado! Verifique seu e-mail para ativar a conta.",
    });

  } catch (error) {
    res.status(500).json({ errors: ["Erro no servidor, tente novamente mais tarde."] });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ errors: ["Usuário não encontrado."] });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Conta já verificada." });
    }

    user.isVerified = true;
    await user.save();

    res.json({ message: "Conta verificada com sucesso!" });

  } catch (error) {
    res.status(400).json({ errors: ["Token inválido ou expirado."] });
  }
};

const login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ errors: ["Usuário não encontrado."] });
      return;
    }

    if (!(await bcrypt.compare(senha, user.senha))) {
      res.status(422).json({ erros: ["Senha inválida"] });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ errors: ["Conta não verificada. Por favor, verifique seu e-mail."] });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ errors: ["Sua conta foi bloqueada. Entre em contato com o suporte."] });
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
  }

  const reqUser = req.user;
  console.log("Log: Dados do usuário autenticado:", reqUser);

  try {
    const user = await User.findById(
      new mongoose.Types.ObjectId(reqUser._id)
    ).select("-senha");

    if (!user) {
      return res.status(404).json({ errors: ["Usuário não encontrado!"] });
    }

    if (nome) {
      user.nome = nome;
    }

    if (senha) {
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(senha, salt);
      user.senha = passwordHash;
    }

    if (profileImage) {
      user.profileImage = profileImage;
    }

    if (telefone) {
      user.telefone = telefone;
    }

    await user.save();

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ errors: ["ID inválido fornecido."] });
  }

  try {
    const user = await User.findById(new mongoose.Types.ObjectId(id)).select(
      "-senha"
    );

    if (!user) {
      return res.status(404).json({ errors: ["Usuário não encontrado!"] });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-senha");

    if (!users || users.length === 0) {
      return res.status(404).json({ errors: ["Nenhum usuário encontrado!"] });
    }

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ errors: ["ID inválido fornecido."] });
  }

  try {
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ errors: ["Usuário não encontrado!"] });
    }

    res.status(200).json({ message: "Usuário excluído com sucesso." });
  } catch (error) {
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
  verifyEmail,
};