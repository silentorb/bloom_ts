/// <reference path="../defs/jquery.d.ts" />
/// <reference path="../defs/metahub.d.ts" />
/// <reference path="../defs/handlebars.d.ts" />
/// <reference path="../defs/when.d.ts" />
declare module Garden {
    class App {
        public page_blocks: {};
        public config: IGarden_Config;
        public queries;
        public current_path: string[];
        public query_service_url: string;
        public load(): Promise;
        public run(): void;
        public initialize_routes(): void;
        public run_query(name: string, args?: {}): Promise;
        public get_current_path(): string;
        public navigate(url): void;
        public not_found(): Promise;
        public get_block(path): Promise;
        public get_view_chain(url: string): Promise;
        public render_view(views, i, last_view?, plot?): Promise;
        public start_app(): Promise;
        public update_page(views, title?: string): void;
        public update_title(view, title): void;
        public get_plot(path, element?): JQuery;
        public transition(plot, view): void;
    }
    function compare_arrays(first, second): boolean;
    interface IGarden_Config {
        block_path: string;
        navigation_mode: Navigation_Mode;
    }
    enum Navigation_Mode {
        path,
        hash,
    }
}

declare module "garden" {
  export = Garden
}