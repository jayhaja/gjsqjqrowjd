// app.js

// Kakao JavaScript SDK가 이미 index.html에서 불러와졌다고 가정합니다.

// Kakao SDK 초기화 (본인의 JavaScript 키로 교체)
Kakao.init('90ed090fa6d7044e65e276410a0232d7');
console.log("Kakao SDK initialized");

// 가입하기 버튼 클릭 시 호출되는 함수
function loginWithKakao() {
  Kakao.Auth.login({
    scope: 'profile_nickname, account_email, gender, age_range, birthyear, phone_number',
    success: function(authObj) {
      console.log("Kakao login success:", authObj);
      // 로그인 성공 후 사용자 정보 요청
      Kakao.API.request({
        url: '/v2/user/me',
        success: function(res) {
          console.log("Kakao user info:", res);
          // 가입 완료 메시지 표시
          document.getElementById('signupResult').innerText = "가입이 완료되었습니다.";

          // 사용자 정보를 백엔드로 전송해서 DB에 저장하기
          fetch('/api/registerKakaoUser', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(res)
          })
          .then(response => response.json())
          .then(data => {
            console.log("서버 응답:", data);
          })
          .catch(error => {
            console.error("사용자 정보 전송 오류:", error);
          });
        },
        fail: function(error) {
          console.error("Failed to get user info:", error);
        }
      });
    },
    fail: function(err) {
      console.error("Kakao login failed:", err);
    }
  });
}

// 위의 코드를 유지하고, 페이지 로드시 자동으로 사용자 정보를 요청하는 부분은 제거합니다.
// Kakao.API.request({
//   url: '/v2/user/me',
//   success: function(res) {
//     // ... 생략 ...
//   },
//   fail: function(error) {
//     console.error("Failed to get user info:", error);
//   }
// });