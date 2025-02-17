// 환경 변수 로드 (최상단에 배치)
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// JSON 파싱 미들웨어 (POST 요청 시 body를 파싱)
app.use(express.json());

// 기본 경로 (홈페이지)
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// 로그인 페이지 라우트: 카카오톡 로그인 버튼을 표시
app.get('/login', (req, res) => {
  res.send(`
    <html>
      <head><title>카카오톡 로그인</title></head>
      <body>
        <h1>로그인 페이지</h1>
        <a href="/auth/kakao">카카오톡으로 로그인하기</a>
      </body>
    </html>
  `);
});

// 카카오 인증 요청 라우트: 카카오 인증 서버로 리디렉션
app.get('/auth/kakao', (req, res) => {
  const client_id = process.env.KAKAO_CLIENT_ID;
  const redirect_uri = process.env.KAKAO_REDIRECT_URI;
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code`;
  res.redirect(kakaoAuthURL);
});

// 카카오 인증 콜백 라우트: 카카오에서 전달한 인가 코드를 처리하고 사용자 정보를 가져옵니다.
app.get('/auth/kakao/callback', async (req, res) => {
  const { code } = req.query; // 카카오에서 전달한 인가 코드
  try {
    // 인가 코드를 액세스 토큰으로 교환하는 요청
    const tokenResponse = await axios({
      method: 'POST',
      url: 'https://kauth.kakao.com/oauth/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code: code
      }
    });

    const access_token = tokenResponse.data.access_token;
    console.log('Access Token:', access_token);

    // 액세스 토큰을 이용해 사용자 정보 요청
    const userResponse = await axios({
      method: 'GET',
      url: 'https://kapi.kakao.com/v2/user/me',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const userData = userResponse.data;
    console.log('카카오 사용자 정보:', userData);

    // 여기서 사용자 정보를 데이터베이스에 저장할 수도 있습니다.
    // 예시: sendUserInfoToDB(userData);

    // 사용자 정보를 브라우저에 표시
    res.send(`로그인 성공! 사용자 정보: ${JSON.stringify(userData)}`);
  } catch (error) {
    console.error('카카오 로그인 오류:', error);
    res.status(500).send('카카오 로그인 중 오류가 발생했습니다.');
  }
});

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kakaoUsers', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB 연결 성공");
})
.catch(err => {
  console.error("MongoDB 연결 오류:", err);
});

// 사용자 스키마 정의 (카카오 로그인으로 받은 정보를 저장)
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  profile_nickname: String,
  account_email: String,
  gender: String,
  age_range: String,
  birthyear: String,
  phone_number: String,
  createdAt: { type: Date, default: Date.now }
});

// 스키마로 모델 생성
const User = mongoose.model('User', userSchema);

// API 엔드포인트: 프론트엔드에서 전달받은 사용자 정보를 MongoDB에 저장
app.post('/api/registerKakaoUser', async (req, res) => {
  try {
    const kakaoUser = req.body;
    console.log("프론트엔드에서 받은 사용자 정보:", kakaoUser);

    // 기존 사용자가 있는지 확인
    let user = await User.findOne({ id: kakaoUser.id });
    if (!user) {
      // 신규 사용자 생성
      user = new User({
        id: kakaoUser.id,
        profile_nickname: kakaoUser.properties ? kakaoUser.properties.nickname : '',
        account_email: kakaoUser.kakao_account ? kakaoUser.kakao_account.email : '',
        gender: kakaoUser.kakao_account ? kakaoUser.kakao_account.gender : '',
        age_range: kakaoUser.kakao_account ? kakaoUser.kakao_account.age_range : '',
        birthyear: kakaoUser.kakao_account ? kakaoUser.kakao_account.birthyear : '',
        phone_number: kakaoUser.kakao_account ? kakaoUser.kakao_account.phone_number : ''
      });
      await user.save();
      console.log("신규 사용자 저장 완료");
    } else {
      console.log("기존 사용자 발견");
    }
    res.json({ success: true, message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error("데이터베이스 저장 오류:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
