const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const jwtSecret = process.env.JWT_SECRET;

const genereteToken = (id) => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: "7d",
  });
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendConfirmationEmail = (email, nome, token) => {
  const confirmationUrl = `${process.env.FRONTEND_URL}/confirm/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Confirmação de Cadastro",
    html: `
      <p>Olá ${nome},</p>
      <p>Por favor, confirme seu cadastro clicando no botão abaixo:</p>
      <a href="${confirmationUrl}" style="
        display: inline-block;
        padding: 10px 20px;
        font-size: 16px;
        color: #ffffff;
        background-color: #007BFF;
        text-decoration: none;
        border-radius: 5px;
      ">Confirmar Cadastro</a>
      <p>Atenciosamente,<br>Equipe</p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Erro ao enviar e-mail:", error);
    } else {
      console.log("E-mail enviado com sucesso:", info.response);
    }
  });
};

const register = async (req, res) => {
  const { nome, email, senha, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(422).json({ errors: ["Por favor, utilize outro e-mail"] });
      return;
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(senha, salt);

    const token = jwt.sign(
      { nome, email, senha: passwordHash, role },
      jwtSecret,
      { expiresIn: "1d" }
    );

    sendConfirmationEmail(email, nome, token);

    res.status(200).json({
      message:
        "Um e-mail de confirmação foi enviado. Verifique sua caixa de entrada.",
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ errors: ["Erro interno do servidor."] });
  }
};

const confirmEmail = async (req, res) => {
  const { token } = req.params;

  console.log("Log: Função confirmEmail chamada");
  console.log("Log: Token recebido = ", token);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log("Log: Token decodificado com sucesso");
    console.log("Log: Dados decodificados = ", decoded);

    const { nome, email, senha, role } = decoded;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Log: Usuário já registrado com o e-mail = ", email);
      return res
        .status(422)
        .json({ errors: ["O e-mail já está registrado."] });
    }

    const newUser = await User.create({
      nome,
      email,
      senha,
      role: role || "morador",
      isEmailConfirmed: true,
    });

    console.log("Log: Novo usuário criado com sucesso");
    console.log("Log: ID do novo usuário = ", newUser._id);

    res.status(201).json({
      _id: newUser._id,
      token: jwt.sign({ id: newUser._id }, jwtSecret, { expiresIn: "7d" }),
      message: "Cadastro confirmado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao confirmar o e-mail:", error);
    res.status(400).json({ errors: ["Token inválido ou expirado."] });
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
  const { nome, senha } = req.body;

  let profileImage = null;

  if (req.file) {
    profileImage = req.file.filename;
  }

  const reqUser = req.user;

  try {
    const user = await User.findById(
      new mongoose.Types.ObjectId(reqUser._id)
    ).select("-senha");

    if (!user) {
      console.log("Usuário não encontrado:", reqUser._id);
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

    await user.save();
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

module.exports = {
  register,
  login,
  getCurrentUser,
  update,
  getUserById,
  getAllUsers,
  deleteUser,
  confirmEmail,
};
