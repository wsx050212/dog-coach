// server.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// ======== 中间件配置 ========
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  methods: ['POST', 'GET']
}));
app.use(express.json());

// ======== 速率限制 ========
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: '请求过于频繁，请稍后再试'
});

// ======== 路由配置 ========
// API密钥验证
app.post('/validate-key', apiLimiter, async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || apiKey.length < 30) {
      return res.status(400).json({ valid: false, message: '无效的API密钥格式' });
    }

    const response = await axios.get('https://api.deepseek.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    res.json({
      valid: response.status === 200,
      message: response.status === 200 ? 'API验证成功' : 'API密钥无效'
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

// 视频分析处理
app.post('/analyze-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传视频文件' });
    }

    const { exerciseType } = req.body;
    const videoPath = req.file.path;
    
    // 此处添加实际视频分析逻辑
    const analysisResult = await analyzeVideo(videoPath, exerciseType);
    
    // 清理临时文件
    fs.unlinkSync(videoPath);

    res.json({
      success: true,
      report: {
        totalCount: analysisResult.total,
        correctCount: analysisResult.correct,
        incorrectCount: analysisResult.incorrect,
        feedback: analysisResult.feedback
      }
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

// ======== 工具函数 ========
async function analyzeVideo(videoPath, exerciseType) {
  // 实现实际的视频分析逻辑
  // 这里可以集成MediaPipe或其他分析库
  return {
    total: 15,
    correct: 12,
    incorrect: 3,
    feedback: ['身体未保持直线（出现5次）', '动作速度过快（出现3次）']
  };
}

function handleApiError(error, res) {
  console.error(`[${new Date().toISOString()}] 错误:`, error.message);
  
  const statusCode = error.response?.status || 500;
  const errorMessage = error.response?.data?.error?.message || '服务器内部错误';

  res.status(statusCode).json({
    error: errorMessage,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}

// ======== 启动服务 ========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] 服务已启动，端口：${PORT}`);
});