import express from 'express';
import cors from 'cors'; // 引入 CORS 模組
import fetch from 'node-fetch';

const app = express();

// 啟用 CORS
app.use(cors());

// 定義 `/proxy` 路由，用於獲取股票圖表數據
app.get('/proxy', async (req, res) => {
    const stockSymbol = req.query.symbol ? `${req.query.symbol}.TW` : null;

    if (!stockSymbol) {
        res.status(400).send({ error: '請提供有效的股票代號參數 (symbol)' });
        return;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?interval=1d&range=5d`;

    console.log(`Fetching data from: ${url}`);
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('無法獲取股價資料:', error);
        res.status(500).send({ error: '無法獲取股價資料' });
    }
});

// 啟動伺服器
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`後端伺服器正在運行於 http://localhost:${PORT}`);
});
