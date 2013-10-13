/// <reference path="../defs/jquery.d.ts" />
/// <reference path="metahub.d.ts" />
import MetaHub = require('metahub');
declare module Bloom {
    var output;
    var ajax_prefix: string;
    var Wait_Animation;
    class Flower extends MetaHub.Meta_Object {
        public override_parameters: boolean;
        public autobind: boolean;
        public element: JQuery;
        public seed;
        public block;
        public query;
        constructor(seed, element: JQuery, block);
        public render(onload?): void;
        public append(flower): void;
        public listen_to_element(event, method): void;
        public get_data(): void;
        public plant(url): void;
        public click(action, meta_object): void;
        public source_to_element(): void;
        public element_to_source(): void;
        public empty(): void;
        public graft_old(selector, other): void;
        public graft(other, property, selector): void;
        public update(test): void;
        public seed_name: string;
        static set_value(elements, value): void;
        static get_value(element);
        static is_input(element): boolean;
    }
    class List extends Flower {
        public block: string;
        public item_type;
        public pager;
        public empty_on_update: boolean;
        public children: Flower[];
        public watching;
        public selection;
        constructor(seed, element: JQuery, block);
        public add_seed_child(seed_item);
        public child_connected(flower): void;
        public process_connect(other, type, other_type): boolean;
        public on_update(seed): void;
        public contains_flower(flower): boolean;
        public load(seed): void;
        public populate(seed): void;
        public remove(item): void;
        public remove_element(item): void;
        public watch_seed(child_name, seed?): void;
        static make_item_selectable(list, item, selection): void;
    }
    function join(): string;
    function get(url, action, error?, wait_parent?): void;
    function post(url, seed, success, error, wait_parent): void;
    function post_json(url, seed, success, error): void;
    function get_url_property(name);
    function get_url_properties(source?): {};
    function edit_text(element, finished): void;
    function watch_input(input, action, delay?): void;
    function bind_input(input, owner, name, source): void;
    function render_query(parameters): string;
}
export = Bloom;
