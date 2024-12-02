import { WEATHER_API_KEY, GOOGLE_MAPS_API_KEY } from './ApiKey.js';

// 保存刷新間隔的引用
let refreshInterval = null;

// 存儲圖表實例
let weatherChart = null;
let temperature;

// 股票代號靜態列表
const stockList = [
    { code: '2330', name: '台積電' },
    { code: '006208', name: '富邦台50' },
    { code: '0050', name: '元大台灣50' },
    { code: '2317', name: '鴻海' },
    { code: '2412', name: '中華電' },
    { code: '2454', name: '聯發科' },
    { code: '2603', name: '長榮' },
    { code: '1301', name: '台塑' },
    { code: '2882', name: '國泰金' },
    { code: '2891', name: '中信金' },
];

// 初始化股票下拉選單
const stockSelect = document.getElementById('stock-select');
stockList.forEach((stock) => {
    const option = document.createElement('option');
    option.value = stock.code;
    option.textContent = stock.name;
    stockSelect.appendChild(option);
});

stockSelect.addEventListener('change', () => {
    const stockSymbol = stockSelect.value;

    // 停止之前的刷新
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    // 查詢選中的股票數據
    fetchStockPriceChange(stockSymbol);

    // 每30秒刷新一次該股票的數據
    refreshInterval = setInterval(() => {
        fetchStockPriceChange(stockSymbol);
    }, 30000);
});

// 動態過濾股票代號
const filterStockList = (input) => {
    const lowerCaseInput = input.toLowerCase();
    return stockList.filter((stock) => stock.toLowerCase().includes(lowerCaseInput));
};

// 查詢股票漲跌幅（支持定時刷新）
const fetchStockPriceChange = async (stockSymbol) => {
    const url = `http://localhost:3000/proxy?symbol=${stockSymbol}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        // 提取數據
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const closePrices = result.indicators.quote[0].close;

        // 檢查數據長度與有效性
        if (timestamps.length === 0 || closePrices.length < 2) {
            throw new Error('數據不足，無法進行計算');
        }

        // 過濾掉無效值
        const validClosePrices = closePrices.filter(price => price !== null);

        if (validClosePrices.length < 2) {
            throw new Error('有效收盤價不足，無法計算昨日與今日收盤價');
        }

        // 提取昨日收盤價與今日最新股價
        const yesterdayClose = closePrices[closePrices.length - 2].toFixed(2);
        const todayPrice = closePrices[closePrices.length - 1].toFixed(2);

        // 計算漲跌幅度
        const change = todayPrice - yesterdayClose;
        const percentageChange = ((change / yesterdayClose) * 100).toFixed(2);

        // 顯示漲跌幅結果
        const stockResult = document.getElementById('stock-result');
        stockResult.innerHTML = `
        <div class="stock-card">
            <h5>股票代碼: ${stockSymbol}</h5>
            <p><strong>昨日收盤價:</strong> ${yesterdayClose}</p>
            <p>
                <strong>今日股價:</strong> 
                <span class="today-price ${change >= 0 ? 'up' : 'down'}">${todayPrice}</span>
            </p>
            <p>
                <strong>漲跌幅:</strong> 
                <span class="price-change ${change >= 0 ? 'up' : 'down'}">
                    ${change >= 0 ? '📈' : '📉'} ${change.toFixed(2)} (${percentageChange}%)
                </span>
            </p>
        </div>
    `;
    } catch (error) {
        console.error('無法獲取股價資料:', error);
        document.getElementById('stock-result').innerHTML = '<p class="text-danger">無法獲取股價資料</p>';
    }
};

// 翻譯表：將 OpenWeather 的英文描述映射到中文
const weatherTranslation = {
    "clear sky": "晴朗",
    "few clouds": "少雲",
    "scattered clouds": "零散雲層",
    "broken clouds": "多雲",
    "shower rain": "陣雨",
    "rain": "下雨",
    "thunderstorm": "雷暴",
    "snow": "下雪",
    "mist": "霧",
};

// 每秒更新一次時間
setInterval(updateTime, 1000);
updateTime();

// 綁定新增按鈕事件
document.getElementById("add-todo").addEventListener("click", addTodo);

// 更新儀表板數據
async function updateDashboard(lat, lon) {
    try {
        // 使用 Google Geocoding API 獲取地理資訊
        const locationResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const locationData = await locationResponse.json();

        // 從 address_components 提取城市和行政區
        let city = "未知城市";
        let district = "未知區域";

        if (locationData.results.length > 0) {
            const components = locationData.results[0].address_components;
            components.forEach((component) => {
                if (component.types.includes("administrative_area_level_1")) {
                    city = component.long_name; // 提取城市名稱
                }
                if (component.types.includes("administrative_area_level_2")) {
                    district = component.long_name; // 提取行政區名稱
                }
            });
        }

        // 顯示在界面上
        document.getElementById("location").innerText = `位置: ${city}, ${district}`;

        // 獲取當前天氣數據
        const currentWeatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
        );
        const currentWeatherData = await currentWeatherResponse.json();
        temperature = currentWeatherData.main.temp;
        const weatherDescription = currentWeatherData.weather[0].description;
        // 如果翻譯表有對應的中文翻譯，使用它；否則顯示英文
        const translatedDescription = weatherTranslation[weatherDescription] || weatherDescription;

        // 更新網頁中的天氣資料
        document.getElementById("weather").innerText = `當前溫度: ${temperature}°C, 天氣: ${translatedDescription}`;

        // 獲取未來天氣數據
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
        );
        const forecastData = await forecastResponse.json();

        // 整理未來 5 天的天氣趨勢
        const dailyTemps = [];
        const labels = [];
        forecastData.list.forEach((forecast) => {
            const date = new Date(forecast.dt * 1000).toLocaleDateString();
            if (!labels.includes(date)) {
                labels.push(date);
                dailyTemps.push(forecast.main.temp);
            }
        });

        drawWeatherChart(labels, dailyTemps);

        // 獲取空氣品質數據
        fetchAirQualityAndUVIndex(lat, lon)

        // 初始化新聞數據
        fetchNews();

        // 初始化待辦事項
        loadTodos();

        // 生活建議
        generateDailyAdvice(airQualityIndex);
    } catch (error) {
        console.error("數據更新錯誤:", error);
    }
}

// 空氣品質與紫外線指數
async function fetchAirQualityAndUVIndex(lat, lon) {
    const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
    const uvIndexUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=yes`

    console.log(lat, lon)
    try {
        // 同時請求空氣品質和紫外線指數
        const [airQualityResponse, uvIndexResponse] = await Promise.all([
            fetch(airQualityUrl),
            fetch(uvIndexUrl),
        ]);

        const airQualityData = await airQualityResponse.json();
        const uvIndexData = await uvIndexResponse.json();

        // 處理空氣品質數據
        const airQualityIndex = airQualityData.list[0].main.aqi;
        const airQualityDescription = getAirQualityDescription(airQualityIndex);
        document.getElementById("air-quality").innerText = `空氣品質指數: ${airQualityIndex} (${airQualityDescription})`;

        // 處理紫外線指數數據
        if (uvIndexData.current && uvIndexData.current.uvi !== undefined) {
            const uvIndex = uvIndexData.current.uvi;

            let uvAdvice = "";
            if (uvIndex >= 8) {
                uvAdvice = "極高，避免曝曬，建議使用防曬措施";
            } else if (uvIndex >= 6) {
                uvAdvice = "高，建議防曬";
            } else if (uvIndex >= 3) {
                uvAdvice = "中等，可適量外出";
            } else {
                uvAdvice = "低，可安心外出";
            }

            document.getElementById("uv-index").innerText = `紫外線指數: ${uvIndex} (${uvAdvice})`;
        } else {
            document.getElementById("uv-index").innerText = "無法獲取紫外線指數";
        }
    } catch (error) {
        console.error("無法獲取空氣品質或紫外線指數：", error);
        document.getElementById("air-quality").innerText = "無法獲取空氣品質數據";
        document.getElementById("uv-index").innerText = "無法獲取紫外線指數";
    }
}

// 獲取空氣品質描述
function getAirQualityDescription(aqi) {
    if (aqi === 1) return "良好";
    if (aqi === 2) return "普通";
    if (aqi === 3) return "對敏感人群不健康";
    if (aqi === 4) return "不健康";
    if (aqi === 5) return "危險";
    return "未知";
}

// 根據空氣品質和溫度生成每日生活建議
function generateDailyAdvice(aqi, temperature) {
    let adviceHTML = "";

    // 根據 AQI 給出空氣品質建議
    if (aqi === 1) {
        adviceHTML += "<p>🌱 空氣品質良好，適合戶外活動。</p>";
    } else if (aqi === 2) {
        adviceHTML += "<p>⚠ 空氣品質普通，敏感人群請注意。</p>";
    } else if (aqi === 3) {
        adviceHTML += "<p>🚫 空氣品質對敏感人群不健康，建議減少外出。</p>";
    } else if (aqi === 4) {
        adviceHTML += "<p>❌ 空氣品質不健康，建議避免長時間戶外活動。</p>";
    } else if (aqi === 5) {
        adviceHTML += "<p>☠ 空氣品質危險，請留在室內並關閉門窗。</p>";
    }

    // 根據溫度給出天氣建議
    if (temperature >= 30) {
        adviceHTML += "<p>🔥 天氣炎熱，請注意補充水分並避免高溫時段外出。</p>";
    } else if (temperature >= 20) {
        adviceHTML += "<p>🌞 氣溫適宜，享受美好的一天吧！</p>";
    } else if (temperature >= 10) {
        adviceHTML += "<p>❄ 天氣稍冷，請注意添加衣物保暖。</p>";
    } else {
        adviceHTML += "<p>🧊 天氣寒冷，建議穿著厚衣物並注意保暖。</p>";
    }

    // 使用 innerHTML 渲染 HTML 標籤
    document.getElementById("daily-advice").innerHTML =
        adviceHTML || "<p>天氣與空氣數據不足，無法生成建議。</p>";
}

// 繪製天氣趨勢圖表
function drawWeatherChart(labels, temps) {
    const ctx = document.getElementById("weather-chart").getContext("2d");

    // 如果已有圖表實例，銷毀它
    if (weatherChart) {
        weatherChart.destroy();
    }

    // 創建新的圖表實例
    weatherChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "未來5天天氣趨勢",
                    data: temps,
                    borderColor: "rgba(75, 192, 192, 1)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderWidth: 2,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true, // 自適應大小
            maintainAspectRatio: false, // 防止圖表過小
        },
    });
}

// 使用 Geolocation 獲取用戶位置，並設置30秒更新一次數據
navigator.geolocation.getCurrentPosition(
    (position) => {
        const { latitude, longitude } = position.coords;

        // 初始化更新一次
        updateDashboard(latitude, longitude);

        // 設置每30秒更新一次
        setInterval(() => {
            updateDashboard(latitude, longitude);
        }, 300000); // 30000 毫秒 = 30 秒
    },
    (error) => {
        console.error("無法獲取用戶位置:", error);
        document.getElementById("location").innerText = "無法獲取位置";
    }
);

// 更新即時日期與時間
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleString("zh-TW", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    document.getElementById("current-time").innerText = `現在時間: ${timeString}`;
}

// 顯示今日新聞標題
async function fetchNews() {
    const API_KEY = "35458dee5f864f13a9ef51ddf442dbbc"; // 替換為您的 API 金鑰
    const BASE_URL = "https://newsapi.org/v2/everything";
    const ITEMS_PER_PAGE = 5; // 每頁顯示 5 則新聞
    let currentPage = 1; // 當前頁碼
    let articles = []; // 保存所有新聞數據

    // 格式化日期函數
    function formatDate(date) {
        return date.toISOString().split("T")[0];
    }

    // 設置初始日期為今天
    let date = new Date();

    // 清空並渲染新聞列表
    function renderNews(page) {
        const newsList = document.getElementById("news-list");
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;

        // 分頁數據
        const pageItems = articles.slice(startIndex, endIndex);

        // 清空舊數據
        newsList.innerHTML = "";

        // 渲染當前頁的新聞
        pageItems.forEach((article) => {
            const listItem = document.createElement("li");
            listItem.className = "list-group-item";
            listItem.innerHTML = `<a href="${article.url}" target="_blank">${article.title}</a>`;
            newsList.appendChild(listItem);
        });

        // 更新分頁導航
        renderPagination();
    }

    // 渲染分頁導航
    // 渲染分頁導航
    function renderPagination() {
        const pagination = document.getElementById("pagination");
        const totalPages = Math.ceil(articles.length / 5);
        const pagesPerSection = 5; // 每個區段顯示的頁數
        const totalSections = Math.ceil(totalPages / pagesPerSection); // 計算總區段數量

        // 計算當前區段
        const currentSection = Math.ceil(currentPage / pagesPerSection);

        // 計算當前區段的頁面範圍
        const startPage = (currentSection - 1) * pagesPerSection + 1;
        const endPage = Math.min(startPage + pagesPerSection - 1, totalPages);

        // 清空舊分頁
        pagination.innerHTML = "";

        // 添加上一區段按鈕
        if (currentSection > 1) {
            const prevSectionItem = document.createElement("li");
            prevSectionItem.className = "page-item";
            prevSectionItem.innerHTML = `<a href="#" class="page-link">«</a>`;
            prevSectionItem.addEventListener("click", (e) => {
                e.preventDefault();
                currentPage = startPage - 1; // 切換到上一區段最後一頁
                renderNews(currentPage); // 渲染新聞內容
                renderPagination(); // 更新分頁導航
            });
            pagination.appendChild(prevSectionItem);
        } else {
            // 禁用上一區段按鈕
            const disabledPrevSection = document.createElement("li");
            disabledPrevSection.className = "page-item disabled";
            disabledPrevSection.innerHTML = `<a href="#" class="page-link">«</a>`;
            pagination.appendChild(disabledPrevSection);
        }

        // 添加當前區段的頁面按鈕
        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement("li");
            pageItem.className = `page-item ${i === currentPage ? "active" : ""}`;
            pageItem.innerHTML = `<a href="#" class="page-link">${i}</a>`;
            pageItem.addEventListener("click", (e) => {
                e.preventDefault();
                currentPage = i; // 切換到選擇的頁面
                renderNews(currentPage); // 渲染新聞內容
                renderPagination(); // 更新分頁導航
            });
            pagination.appendChild(pageItem);
        }

        // 添加下一區段按鈕
        if (currentSection < totalSections) {
            const nextSectionItem = document.createElement("li");
            nextSectionItem.className = "page-item";
            nextSectionItem.innerHTML = `<a href="#" class="page-link">»</a>`;
            nextSectionItem.addEventListener("click", (e) => {
                e.preventDefault();
                currentPage = endPage + 1; // 切換到下一區段第一頁
                renderNews(currentPage); // 渲染新聞內容
                renderPagination(); // 更新分頁導航
            });
            pagination.appendChild(nextSectionItem);
        } else {
            // 禁用下一區段按鈕
            const disabledNextSection = document.createElement("li");
            disabledNextSection.className = "page-item disabled";
            disabledNextSection.innerHTML = `<a href="#" class="page-link">»</a>`;
            pagination.appendChild(disabledNextSection);
        }
    }

    // 用於重試查詢前一天的新聞
    async function fetchWithRetry(date) {
        const formattedDate = formatDate(date);
        const url = `${BASE_URL}?q=台灣&language=zh&from=${formattedDate}&sortBy=publishedAt&apiKey=${API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            // 如果有新聞數據
            if (data.status === "ok" && data.articles.length > 0) {
                articles = data.articles; // 保存新聞數據
                renderNews(currentPage); // 渲染第一頁
                return true; // 成功獲取新聞，停止重試
            } else {
                return false; // 沒有新聞數據
            }
        } catch (error) {
            console.error("獲取新聞失敗：", error);
            return false; // 網絡或 API 錯誤
        }
    }

    // 不斷嘗試抓取前一天新聞
    let success = false;
    while (!success) {
        success = await fetchWithRetry(date);
        if (!success) {
            // 如果今天無新聞，嘗試抓取前一天
            date.setDate(date.getDate() - 1);
        }
    }
}

// 待辦事項處理
function loadTodos() {
    const todos = JSON.parse(localStorage.getItem("todos")) || [];
    const todoList = document.getElementById("todo-list");
    todoList.innerHTML = ""; // 清空舊數據
    todos.forEach((todo, index) => {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item d-flex justify-content-between align-items-center";
        listItem.innerHTML = `
            ${todo}
            <button class="btn btn-sm btn-danger" onclick="removeTodo(${index})">刪除</button>
        `;
        todoList.appendChild(listItem);
    });
}

// 新增待辦
function addTodo() {
    const todoInput = document.getElementById("todo-input");
    const newTodo = todoInput.value.trim();
    if (newTodo) {
        const todos = JSON.parse(localStorage.getItem("todos")) || [];
        todos.push(newTodo);
        localStorage.setItem("todos", JSON.stringify(todos));
        todoInput.value = "";
        loadTodos();
    }
}

// 移除待辦
function removeTodo(index) {
    const todos = JSON.parse(localStorage.getItem("todos")) || [];
    todos.splice(index, 1);
    localStorage.setItem("todos", JSON.stringify(todos));
    loadTodos();
}