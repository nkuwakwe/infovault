import {InstanceInfo, adduser, Specialuser} from "./utils/utils.js";
import {I18n} from "./i18n.js";
import {Dialog, FormError} from "./settings.js";
import {makeRegister} from "./register.js";
import {trimTrailingSlashes} from "./utils/netUtils";
import {signIn, storeAuthToken} from "./utils/supabaseAuth.js";
function generateRecArea(recover = document.getElementById("recover")) {
	if (!recover) return;
	recover.innerHTML = "";
	const can = localStorage.getItem("canRecover");
	if (can) {
		const a = document.createElement("a");
		a.textContent = I18n.login.recover();
		a.href = "/reset" + window.location.search;
		recover.append(a);
	}
}
const recMap = new Map<string, Promise<boolean>>();
async function recover(e: InstanceInfo, recover = document.getElementById("recover")) {
	const prom = new Promise<boolean>(async (res) => {
		if (!recover) {
			res(false);
			return;
		}
		recover.innerHTML = "";
		try {
			if (!(await recMap.get(e.api))) {
				if (recMap.has(e.api)) {
					throw Error("can't recover");
				}
				recMap.set(e.api, prom);
				const json = (await (await fetch(e.api + "/policies/instance/config")).json()) as {
					can_recover_account: boolean;
				};
				if (!json || !json.can_recover_account) throw Error("can't recover account");
			}
			res(true);
			localStorage.setItem("canRecover", "true");
			generateRecArea(recover);
		} catch {
			res(false);
			localStorage.removeItem("canRecover");
			generateRecArea(recover);
		} finally {
			res(false);
		}
	});
}

export async function makeLogin(
	trasparentBg = false,
	instance = "",
	handle?: (user: Specialuser) => void,
) {
	const dialog = new Dialog("");
	const opt = dialog.options;
	opt.addTitle(I18n.login.login());
	dialog.show(trasparentBg);

	const form = opt.addForm(
		"",
		async (res) => {
			if ("email" in res && "password" in res) {
				const emailValue = res.email as string;
				const passwordValue = res.password as string;
				
				// Transform email to login for Spacebar API compatibility
				const loginData = {
					login: emailValue,
					password: passwordValue
				};
				
				// Authenticate with Supabase
				const authResponse = await signIn(emailValue, passwordValue);
				
				if (authResponse.error) {
					throw new FormError(password, authResponse.error.message || "Login failed");
				}
				
				if (authResponse.session?.access_token && authResponse.user?.id) {
					// Store authentication credentials
					storeAuthToken(authResponse.session.access_token);
					localStorage.setItem('sb_user_id', authResponse.user.id);
					localStorage.setItem('sb_user_email', authResponse.user.email);
					
					// Load the Spacebar instance
					try {
						const instanceInfo = JSON.parse(localStorage.getItem("instanceinfo") as string);
						const u = adduser({
							serverurls: instanceInfo,
							email: emailValue,
							token: authResponse.session.access_token,
						});
						u.username = emailValue;
						
						if (handle) {
							handle(u);
							dialog.hide();
							return;
						}
						
						// Redirect to main application
						const redir = new URLSearchParams(window.location.search).get("goback");
						if (redir && (!URL.canParse(redir) || new URL(redir).host === window.location.host)) {
							window.location.href = redir;
						} else {
							window.location.href = "/channels/@me";
						}
					} catch (err) {
						throw new FormError(password, "Failed to load instance");
					}
				} else {
					throw new FormError(password, "No session token received");
				}
			} else {
				throw new FormError(password, "Invalid form data");
			}
		},
		{
			submitText: I18n.login.login(),
			method: "POST",
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			},
			vsmaller: true,
		},
	);
	const button = form.button.deref();
	button?.classList.add("createAccount");

	const email = form.addTextInput(I18n.htmlPages.emailField(), "login");
	const password = form.addTextInput(I18n.htmlPages.pwField(), "password", {password: true});
	form.addCaptcha();
	const a = document.createElement("a");
	a.onclick = () => {
		dialog.hide();
		makeRegister(trasparentBg, "", handle);
	};
	a.textContent = I18n.htmlPages.noAccount();
	const rec = document.createElement("div");
	form.addHTMLArea(rec);
	// Default the login endpoint to local proxy to avoid CORS
	form.fetchURL = "/api/auth/login";
	form.addHTMLArea(a);
}
await I18n.done;
// If the static login-shell exists on the page, prefer it and skip the
// SPA/dialog-based login which would otherwise override the static layout.
if (window.location.pathname.startsWith("/login") && !document.querySelector('.login-shell')) {
	makeLogin();
}
