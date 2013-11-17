/// <reference path="../defs/jquery.d.ts" />
/// <reference path="../defs/metahub.d.ts" />
/// <reference path="../defs/handlebars.d.ts" />
/// <reference path="../defs/when.d.ts" />
declare module Bloom {
    var output;
    var ajax_prefix: string;
    var Wait_Animation;
    class Flower extends MetaHub.Meta_Object {
        public element: JQuery;
        public seed;
        static blocks: {};
        static namespace;
        static access_method: (action: any, target?: any) => boolean;
        constructor(seed, element: JQuery);
        public initialize(): void;
        public append(flower): void;
        public query(): string;
        static load_blocks_from_string(text: string): void;
        static find_flower(path);
        public grow(): void;
        static render_block(name, seed): JQuery;
        static grow(element_or_block_name, seed, flower?: Flower): JQuery;
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
        public add_seed_child(seed): Flower;
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