use dioxus::prelude::*;

const TAILWIND_CSS: Asset = asset!("/assets/tailwind.css");

fn main() {
    dioxus::launch(app);
}

#[component]
fn app() -> Element {
    rsx! {
        document::Stylesheet { href: TAILWIND_CSS }
        Router::<Route> {}
    }
}

#[derive(Routable, Clone, PartialEq)]
enum Route {
    #[route("/")]
    SplashScreen {},
    #[route("/home")]
    HomeScreen {},
}

#[component]
fn SplashScreen() -> Element {
    let nav = navigator();

    use_effect(move || {
        spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            nav.replace(Route::HomeScreen {});
        });
    });

    rsx! {
        div {
            "data-testid": "splash-screen",
            class: "flex min-h-screen items-center justify-center bg-background font-sans",
            div { class: "flex flex-col items-center gap-lg",
                div { class: "flex h-24 w-24 items-center justify-center rounded-full bg-primary",
                    span { class: "text-4xl", "📱" }
                }
                h1 { class: "text-3xl font-bold text-foreground", "Formo" }
                p { class: "text-muted", "Loading..." }
            }
        }
    }
}

#[component]
fn HomeScreen() -> Element {
    rsx! {
        div {
            "data-testid": "home-screen",
            class: "flex min-h-screen items-center justify-center bg-background font-sans",
            div { class: "flex flex-col items-center gap-md text-center",
                h1 { class: "text-4xl font-bold text-foreground", "Hello, World!" }
                p { class: "text-lg text-muted", "Welcome to Formo" }
            }
        }
    }
}
