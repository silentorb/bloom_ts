/// <reference path="../defs/jquery.d.ts" />
/// <reference path="../defs/metahub.d.ts" />
/// <reference path="../defs/handlebars.d.ts" />
/// <reference path="../defs/when.d.ts" />
declare module Bloom {
    interface IBlock {
        template;
        query?;
        name?;
    }
    var output;
    var ajax_prefix: string;
    var Wait_Animation;
    class Block {
        static handlebars: {
            registerHelper(name: string, fn: Function, inverse?: boolean): void;
            registerPartial(name: string, str: any): void;
            K(): void;
            createFrame(object: any): any;
            Exception(message: string): void;
            SafeString: {
                toString(): string;
                new(str: string): Handlebars.SafeString;
            };
            parse(input: string): boolean;
            logger: Handlebars.Logger;
            log(level: number, obj: any): void;
            compile(input: any, options?: any): (context: any, options?: any) => string;
        };
        private static block_tree;
        static blocks: any[];
        static get_block(path: string): IBlock;
        static add_block(path: string, block: IBlock): void;
        static load_blocks_from_string(text: string): void;
        private static load_block_query(block, seed, url);
        static render_block(block: IBlock, seed, default_element?: JQuery): Promise;
        static render_block_by_name(name: string, seed): Promise;
        private static expand_block_element(old_element, new_element);
        static grow(element_or_block_name, original_seed, flower?: Flower, url?: string): Promise;
        private static grow_children(element, seed, flower);
    }
    class Flower extends MetaHub.Meta_Object {
        public element: JQuery;
        public seed;
        static namespace;
        static access_method: (action: any, target?: any) => boolean;
        constructor(seed, element: JQuery);
        public initialize(): void;
        public append(flower): void;
        public query(): string;
        static get_wildcard(token);
        static find_flower(path);
        public grow(): void;
        static get_url_args(url: string, actual: string): {};
        public plant(url): void;
        public empty(): void;
        public graft(other, property, selector): void;
        public update(post_data?): void;
        public seed_name: string;
        static set_value(elements: JQuery, value: any): void;
        static get_value(element: JQuery): any;
        static is_input(element): boolean;
    }
    class List extends Flower {
        public item_type;
        public item_block: string;
        public pager;
        public empty_on_update: boolean;
        public children: Flower[];
        public watching;
        public selection;
        public list_element: JQuery;
        constructor(seed, element: JQuery);
        public grow(): void;
        private get_item_type(element);
        private get_element(seed);
        public add_seed_child(seed): Promise;
        public child_connected(flower): void;
        public on_update(seed): void;
        public load(seed): void;
        public populate(seed): void;
        public remove(item): void;
        public remove_element(item): void;
        public watch_seed(child_name, seed?): void;
        static make_item_selectable(list, item, selection): void;
    }
    class Irrigation {
        static path_array(path);
    }
    function get(url, action, error?, wait_parent?: JQuery): void;
    function ajax(url: string, settings): Promise;
    function get_url_property(name);
    function get_url_properties(source?): {};
    function edit_text(element, finished): void;
    function watch_input(input, action, delay?): void;
    function bind_input(input, owner, name, source): void;
    function render_query(parameters): string;
    function join(...args: any[]): string;
}

declare module "bloom" {
  export = Bloom
}