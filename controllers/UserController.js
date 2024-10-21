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
  const { nome, email, senha, role } = req.body;

  console.log('Dados recebidos para registro:', { nome, email, senha, role });

  const user = await User.findOne({ email });

  if (user) {
    console.log('Usuário já existe:', email);
    res.status(422).json({ errors: ["Por favor, utilize outro e-mail"] });
    return;
  }

  const salt = await bcrypt.genSalt();
  console.log('Salt gerado:', salt);
  
  const passwordHash = await bcrypt.hash(senha, salt);
  console.log('Senha hasheada:', passwordHash); 

  const newUser = await User.create({
    nome,
    email,
    senha: passwordHash,
    role: role || 'morador',
  });

  if (!newUser) {
    console.log('Erro ao criar novo usuário'); 
    res.status(422).json({ errors: "Houve um erro, por favor tente novamente mais tarde." });
    return;
  }

  console.log('Novo usuário criado:', newUser);

  res.status(201).json({
    _id: newUser._id,
    token: genereteToken(newUser._id),
  });
};


const login = async (req, res) => {
  const { email, senha } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404).json({ errors: ["Usuário não encontrado."] });
    return;
  }

  if (!(await bcrypt.compare(senha, user.senha))) {
    res.status(422).json({ erros: ["Senha inválida"] });
    return;
  }

  res.status(201).json({
    _id: user._id,
    profileImage: user.profileImage,
    token: genereteToken(user._id),
  });
};

const getCurrentUser = async (req, res) => {
  const user = req.user;

  res.status(200).json(user);
};

const update = async (req, res) => {
  const { name, senha } = req.body;

  let profileImage = null;

  if (req.file) {
    profileImage = req.file.filename;
  }

  const reqUser = req.user;

  const user = await User.findById(
    new mongoose.Types.ObjectId(reqUser._id)
  ).select("-senha");

  if (name) {
    user.name = name;
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
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(new mongoose.Types.ObjectId(id)).select(
      "-senha"
    );

    if (!user) {
        res.status(404).json({ errors: ["Usuário não encontrado!"] });
        return;
    }
  res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ errors: ["Usuário não encontrado!"] });
    return;
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  update,
  getUserById,
};
