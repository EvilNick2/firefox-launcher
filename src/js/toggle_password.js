const icon = document.getElementById('togglePassword');
let password = document.getElementById('password-input');

icon.addEventListener('click', function() {
  if(password.type === "password") {
    password.type = "text";
		icon.classList.add("fa-eye");
    icon.classList.remove("fa-eye-slash");
  }
  else {
    password.type = "password";
    icon.classList.add("fa-eye-slash");
    icon.classList.remove("fa-eye");
  }
});