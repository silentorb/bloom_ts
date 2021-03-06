/// <reference path="../defs/jquery.d.ts" />
/// <reference path="../defs/metahub.d.ts" />
/// <reference path="../defs/handlebars.d.ts" />
/// <reference path="../defs/when.d.ts" />

import MetaHub = require('metahub')
import Handlebars = require('handlebars')
import when = require('when')

declare var Garden

module Bloom {

  export interface IBlock {
    template
    query?
    name?
  }

  export var output = null
  export var ajax_prefix:string
  export var Wait_Animation

  export class Block {
    static handlebars = Handlebars
    private static block_tree = {}
    static blocks = []


    static get_block(path:string):IBlock {
      var tokens = path.split('/')
      var level = Block.block_tree
      for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i]
        if (level[token]) {
          level = level[token]
        }
        else {
          level = Flower.get_wildcard(level)
          if (!level)
            return null
        }
      }

      if (level['self'])
        return level['self']

      return null
    }

    static add_block(path:string, block:IBlock) {
      var tokens = path.split('/')
      var level = Block.block_tree
      for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i]
        if (typeof level[token] !== 'object') {
          level[token] = {}
        }
        level = level[token]
      }

      level['self'] = block
      Block.blocks.push(block)
    }

    static load_blocks_from_string(text:string) {
      var data = $(text)
      data.children().each(function () {
        var child = $(this)
        var id = child.attr('name') || child[0].tagName.toLowerCase()
        if (id) {
          var block:IBlock = Block.get_block(id)
          if (block)
            console.log('Duplicate block tag name: ' + id + '.')

          block = {
            template: Handlebars.compile(this.outerHTML)
          }
          Block.add_block(id, block)

//          // Check for wildcards.  This currently duplicates
//          // wildcard entries for easier lookup
//          var tokens = id.split('/')
//          if (tokens[tokens.length - 1][0] == ':') {
////            tokens[tokens.length - 1] = '*'
//            blocks[tokens.join('/')] = block
//          }

          for (var i = 0; i < this.attributes.length; ++i) {
            var attribute = this.attributes[i]
            block[attribute.nodeName] = attribute.nodeValue
          }
        }
        else {
          console.log('Error with block tag name');
        }
      })
    }


    private static load_block_query(block, seed, url:string):Promise {
      if (!block)
        return when.resolve(seed)

      var query_name = block.query || block.name
      var query = Garden.app.queries[query_name]
      if (query) {
        var args = Flower.get_url_args(block.name, url)

        return Garden.app.run_query(query_name, args)
          .then((response)=> {
            if (query.is_single)
              seed = response.objects[0]
            else
              seed = response.objects

            return seed
          })
      }

      return when.resolve(seed)
    }

    static render_block(block:IBlock, seed, default_element:JQuery = null):Promise {
      if (!block)
        return when.resolve(default_element)

      var template = block.template

      var source = template(seed)
      var element = $(source)
      element.data('block', block) // Store a back-reference to the block in the jQuery element
      return when.resolve(element)
    }

    static render_block_by_name(name:string, seed):Promise {
      var block = Block.get_block(name)
      return Block.render_block(block, seed)
    }

//    private static get_element_block(block:IBlock, seed):Promise {
//      if (typeof element_or_block_name === 'string') {
//        return Flower.render_block(block, seed)
//      }
//
//      return Flower.expand_block_element(block, seed)
//    }

    private static expand_block_element(old_element:JQuery, new_element:JQuery):JQuery {
      // Copy attributes
      for (var i = 0; i < old_element[0].attributes.length; ++i) {
        var attribute = old_element[0].attributes[i]
        new_element.attr(attribute.nodeName, attribute.nodeValue)
      }

      old_element.replaceWith(new_element)
      return new_element
    }

    static grow(element_or_block_name, original_seed, flower:Flower = null, url:string = null):Promise {
      var tagname:string, existing_element:JQuery
      if (typeof element_or_block_name === 'string') {
        tagname = element_or_block_name
      }
      else {
        existing_element = element_or_block_name
        tagname = existing_element.attr('name') || existing_element[0].tagName.toLowerCase()
      }

      var block = Block.get_block(tagname)
      if (!block && !existing_element) {
        if (typeof element_or_block_name === 'string')
          throw new Error('Could not find block ' + element_or_block_name)
        else
          throw new Error('Invalid element to grow.')
      }

      return Block.load_block_query(block, original_seed, url)
        .then((seed)=> Block.render_block(block, seed, existing_element)
          .then((element:JQuery)=> {
            if (typeof element_or_block_name === 'object')
              Block.expand_block_element(element_or_block_name, element)

            var bind = element.attr('bind')
            if (bind) {
              if (typeof seed[bind] != 'object') {
                if (seed[bind])
                  Flower.set_value(element, seed[bind])

                Bloom.watch_input(element, ()=> {
                  seed[bind] = Flower.get_value(element)
                })
              }
              else {
                seed = seed[bind]
              }
            }

            if (typeof Flower.access_method === 'function') {
              var access = element.attr('access')
              if (access) {
                if (!Flower.access_method(access, seed)) {
                  element.remove()
                  return $('<span class="Access denied"></span>')
                }
              }
            }

            // Associate code-behind
            if (element.attr('flower')) {
              console.log('flower', element.attr('flower'))
              var flower_type:any = Flower.find_flower(element.attr('flower'))
              if (flower_type) {
                flower = <Flower>new flower_type(seed, element)
              }
              else throw new Error('Could not find flower ' + element.attr('flower') + '.')
            }

            var onclick = element.attr('click')
            if (flower && onclick && typeof flower[onclick] === 'function') {
              element.click(function (e) {
                e.preventDefault()
                flower[onclick].call(flower, element)
              })
            }

            return Block.grow_children(element, seed, flower)
              .then(()=> element)
          })
      )
    }

    private static grow_children(element:JQuery, seed, flower:Flower):Promise {
      var promises = []
      element.children().each((i, node)=> {
        var child_seed
        if (MetaHub.is_array(seed))
          child_seed = seed[i]
        else
          child_seed = seed

        promises.push(Block.grow($(node), child_seed, flower)
          .then((child)=> {
            if (child.parent()[0] !== element[0]) {
              child.detach()
              element.append(child)
            }
          }))
      })

      return when.all(promises).then(()=> {
        if (flower)
          flower.grow()
      })
    }

  }

  export class Flower extends MetaHub
    .
    Meta_Object {
    element:JQuery;
    seed;
    static namespace
    static access_method:(action, target?)=>boolean = null

    constructor(seed, element:JQuery) {
      super()
      this.seed = seed
      this.element = element

      this.listen(this, 'disconnect-all', function () {
        if (this.element) {
          this.element.remove();
          this.element = null;
        }
      });

      this.initialize()
    }

    initialize() {
    }

    append(flower) {
      this.element.append(flower.element);
    }

    query():string {
      return '';
    }

    static get_wildcard(token) {
      for (var t in token) {
        if (t[0] == ':') {
          return token[t]
        }
      }
      return null
    }

    static find_flower(path) {
      var tokens = path.split('.')
      var result = Flower.namespace
      for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i]
        result = result[token]
        if (!result)
          throw new Error('Invalid namespace path: ' + path)
      }

      return result
    }

    grow() {

    }

    static get_url_args(url:string, actual:string) {
      if (typeof url !== 'string' || typeof actual !== 'string')
        return {}

      var result = {}
      var url_tokens = url.split('/')
      var actual_tokens = actual.split('/')
      for (var i = 0; i < url_tokens.length; ++i) {
        var token = url_tokens[i]
        if (token[0] == ':' && typeof actual_tokens[i] == 'string')
          result[token] = actual_tokens[i]
      }

      return result
    }

    plant(url) {
      jQuery.post(url, this.seed, function (response) {
        if (!response.result) {
          Bloom.output('There was a problem communicating with the server.');
          return;
        }
        if (response.result.toLowerCase() == 'success') {
          this.invoke('plant.success', response);
        }
        else
          this.invoke('plant.error', response);
      });
    }

    empty() {
      this.disconnect_all('child');
      this.element.empty();
    }

    graft(other, property, selector) {
      if (selector === undefined) {
        selector = '.' + property.replace('_', '-');
      }
      var element = this.element.find(selector);
      this.listen(other, 'change.' + property, function (value) {
        Flower.set_value(element, value);
      });

      Flower.set_value(element, other[property]);
    }

    update(post_data = undefined) {
      var self = this;
      if (this.query == undefined) {
        return;
      }

      var query = this.query();
      if (!query) {
        return;
      }

      var wait, finished = false;
      if (Bloom.Wait_Animation) {
        setTimeout(function () {
          if (!finished) {
            var parent = self.element.parent();
            if (parent) {
              wait = Bloom.Wait_Animation.create();
              parent.append(wait.element);
            }
          }
        }, 100);
      }
      var settings = {
        type: 'GET',
        data: post_data
      }

      if (post_data) {
        settings.type = 'POST'
      }
      jQuery.ajax(query, settings)
        .then((response)=> {
          finished = true;
          if (wait) {
            wait.element.remove();
          }
          var seed;
          if (this.seed_name == null || this.seed_name == '')
            seed = response;
          else
            seed = response[this.seed_name];

          if (seed === undefined) {
            throw new Error('Could not find valid response data.');
          }
          this.invoke('update', seed, response);
        })
    }

    // Returns a url string to the service from which this object receives its data.
    //    query: function() {},
    // Name of the property of the query response that contains the actual object data.
    seed_name = '';


    static set_value(elements:JQuery, value:any) {
      elements.each(function () {
        var element = $(this);
        if (Flower.is_input(element)) {
          if (element.attr('type') == 'checkbox') {
            if (value === true || value === 'true')
              element.attr('checked', 'checked');
            else
              element.removeAttr('checked');
          }
          else {
            element.val(value);
          }
        }
        else {
          element.html(value);
        }
      });
    }

    static get_value(element:JQuery):any {
      if (Flower.is_input(element)) {
        if (element.attr('type') == 'checkbox') {
          return element.prop('checked', true)
        }
        else {
          return element.val();
        }
      }
      else {
        return element.text();
      }
    }

    static is_input(element) {
      if (element.length == 0)
        return false;
      var name = element[0].nodeName.toLowerCase();
      return name == 'input' || name == 'select' || name == 'textarea';
    }
  }

  export class List extends Flower {
    // List did not used to define a default block because blocks used to override
    // existing jQuery elements/selectors passed to the constructer.  Now that that
    // is not the case it is safe to have this default.
    item_type = null
    item_block:string = null
    pager = null
    empty_on_update = true
    children:Flower[]
    watching
    selection
    list_element:JQuery

    constructor(seed, element:JQuery) {
      super(seed, element)
      this.seed_name = 'objects'
      this.optimize_getter('children', 'child')
      this.listen(this, 'update', this.on_update)
      this.listen(this, 'connect.child', this.child_connected)
      this.listen(this, 'disconnect.child', this.remove_element)
      this.item_type = element.attr('item_type') || this.item_type
      this.item_block = element.attr('item_block')
      if (element.attr('list'))
        this.list_element = element.find(element.attr('list'))
      else
        this.list_element = element
    }

    grow() {

      if (typeof this.seed == 'object') {
        // When a seed is a simple array or object, the flower is usually responsible
        // for population, so watching is optional.  When using a Meta_Object,
        // the Meta_Object is responsible for population so it is rare that it
        // should not be watched.
        if (this.seed.is_meta_object)
          this.watch_seed(this.seed);
        else
          this.populate(this.seed);
      }
    }

    private get_item_type(element) {
      var item_type = this.item_type || Flower
      if (element && element.attr('flower')) {
        var flower_type:any = Flower.find_flower(element.attr('flower'))
        if (flower_type)
          item_type = flower_type
      }

      return item_type
    }

    private get_element(seed):Promise {
      if (this.item_block) {
        return Block.render_block_by_name(this.item_block, seed)
          .then((block)=> Block.grow(block, seed))
      }

      return when.resolve()
    }

    add_seed_child(seed):Promise {
      return this.get_element(seed)
        .then((element)=> {
          var item_type = this.get_item_type(element)
          var flower = new item_type(seed, element)
          this.connect(flower, 'child', 'parent')
          return flower
        })
    }

    child_connected(flower) {
      var line;
      if (flower.element[0].nodeName.toLowerCase() == 'li' || this.element.prop('tagName') != 'UL') {
        line = flower.element;
      }
      else {
        line = jQuery('<li></li>');
        line.append(flower.element);
      }
      this.list_element.append(line);
      if (this.selection) {
        List.make_item_selectable(this, flower, this.selection);
      }
    }

    on_update(seed) {
      var self = this;
      // Catch it early
      if (!this.element) {
        throw Error('element is null!');
      }

      if (this.empty_on_update || !this.seed) {
        this.empty();
        this.seed = seed;
      }
      else {
        this.seed = this.seed.concat(seed);
      }

      this.load(seed);
    }

    load(seed) {
      seed = seed || this.seed
      this.populate(seed);
      this.invoke('updated', seed);
    }

    populate(seed) {
      var x
      if (seed.is_meta_object) {
        var children = seed.get_connections('child');
        for (x = 0; x < children.length; ++x) {
          this.add_seed_child(children[x]);
        }
      }
      else if (MetaHub.is_array(seed)) {
        for (x = 0; x < seed.length; ++x) {
          this.add_seed_child(seed[x]);
        }
      }
      else {
        for (x in seed) {
          this.add_seed_child(seed[x]);
        }
      }
    }

    remove(item) {
      if (item.element && item.element.parent() == this ||
        (item.element.parent() && item.element.parent().parent() == this)) {
        item.element.detach();
      }
      this.disconnect(item);
    }

    remove_element(item) {
      if (item.element) {
        if (item.element.parent()[0] == this.element[0]) {
          item.element.detach();

        } else if (item.element.parent() && item.element.parent().parent()[0] == this.element[0]) {
          var temp = item.element.parent();
          item.element.detach();
          temp.remove();
        }
      }
    }

    watch_seed(child_name, seed = undefined) {
      if (seed !== undefined) {
        this.seed = seed;
      }

      if (this.watching === this.seed)
        return;

      if (typeof child_name != 'string') {
        child_name = 'child';
      }

      this.listen(this.seed, 'connect.' + child_name, function (item) {
        this.add_seed_child(item);
      });

      this.listen(this.seed, 'disconnect.' + child_name, function (item) {
        var children = this.get_connections('child');

        for (var x = 0; x < children.length; x++) {
          if (children[x].seed === item) {
            this.disconnect(children[x]);
            return;
          }
        }
      });

      var children = this.seed.get_connections(child_name);
      this.populate(children);

      this.watching = this.seed;
    }

    static make_item_selectable(list, item, selection) {
      item.click(function () {
        if (MetaHub.get_connection(item.seed, selection))
          return;

        selection.disconnect_all('selected');
        selection.connect(item.seed, 'selected', 'selection');
      });

      if (MetaHub.get_connection(item.seed, selection))
        item.element.addClass('selected');

      list.listen(item.seed, 'connect.selection', function () {
        item.element.addClass('selected');
      });

      list.listen(item.seed, 'disconnect.selection', function () {
        item.element.removeClass('selected');
      });
    }
  }

  export class Irrigation {
    static path_array(path) {
      if (typeof path == 'object')
        return path;

      if (!path || path.length == 0)
        return [];
      if (path[0] == '/')
        path = path.substring(1);
      if (path[path.length - 1] == '/')
        path = path.substring(0, path.length - 1);
      return path.split('/');
    }
  }

  export function get(url, action, error = null, wait_parent:JQuery = null) {
    var wait;
//    if (Bloom.ajax_prefix) {
//      url = Bloom.join(Bloom.ajax_prefix, url);
//    }

    var success = function (response) {
      try {
        var json = JSON.parse(response);
      }
      catch (e) {
        console.log('There was a problem parsing the server response in Bloom.get');
        console.log(e.message);
      }
      if (json.success === false || json.success === 'false') {
        Bloom.output(json);
        if (typeof error == 'function') {
          error(json, response);
        }
      }
      else {
        action(json);

        if (typeof Bloom.output == 'function' && json && typeof json.message == 'string') {
          Bloom.output(json);
        }
      }
    };

    var settings = {
      type: 'GET',
      url: url,
      success: success,
      error: error,
      dataType: 'text',
      complete: undefined
    };
    if (wait_parent && Bloom.Wait_Animation) {
      wait = Bloom.Wait_Animation.create();
      wait_parent.append(wait.element);
      settings.complete = function () {
        if (wait)
          wait.element.remove();
      }
    }

    jQuery.ajax(settings);
  }

  export function ajax(url:string, settings):Promise {
    var wait, def = when.defer()

    var defaults = {
      type: 'GET',
      url: url,
      dataType: 'json',
      contentType: 'application/json',
      complete: undefined
    }

    settings = MetaHub.extend(defaults, settings)
    settings.success = function (response) {
      def.resolve(response)
    }

    settings.error = function (response) {
      def.reject()
    }

    if (settings.wait_parent && Bloom.Wait_Animation) {
      wait = Bloom.Wait_Animation.create();
      settings.wait_parent.append(wait.element);
      settings.complete = function () {
        if (wait)
          wait.element.remove();
      }
    }

    jQuery.ajax(settings)

    return def.promise
  }

  export function get_url_property(name) {
    return Bloom.get_url_properties()[name];
  }

  export function get_url_properties(source = null) {
    var result = {}, text;
    if (source !== undefined)
      text = source
    else
      text = window.location.search;

    var items = text.slice(1).split(/[\&=]/);
    if (items.length < 2)
      return {};

    for (var x = 0; x < items.length; x += 2) {
      result[items[x]] = decodeURIComponent(items[x + 1].replace(/\+/g, ' '));
    }
//  }
    return result;
  }

  export function edit_text(element, finished) {
    var text = element.text();
    element.html('<input type="text"/>');
    var input = element.find('input');
    input.val(text);
    input.select();

    var finish = function () {
      var value = input.val();
      element.text(value);
      if (typeof finished == 'function') {
        finished(value, element);
      }
    };

    input.blur(finish);
    input.keypress(function (event) {
      event.bubbles = false;
      event.stopPropagation();
      if (event.keyCode == 13) {
        finish();
      }
    });
  };

  export function watch_input(input, action, delay = null) {
    if (!delay && delay !== 0)
      delay = 800;
    var timer = null;

    var finished = function (event) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      action(input.val(), event);
    }

    input.change(
      function (event) {
        finished(event)
      });

    input.keypress(function (event) {
      // For browsers that fire keypress and keyup on backspace,
      // ensure only the keypress hook captures it to avoid double responses.
      if (event.keyCode == 8)
        return;

//      if (event.keyCode == 13) {
//        event.preventDefault();
//        finished(event);
//        return;
//      }

      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(finished, delay);
    });

    // Chrome (possibly all of webkit?) doesn't fire keypress
    // on backspace, but it does fire keyup
    input.keyup(function (event) {
      if (event.keyCode == 8) {
        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(finished, delay);
      }
    });
  };

  export function bind_input(input, owner, name, source) {
    input.val(owner[name]);

    Bloom.watch_input(input, function () {
      owner.value(name, input.val(), source);
    });

    source.listen(owner, 'change.' + name, function (value) {
      input.val(value);
    });

    input.focus(function () {
      input.select();
    });
  }

  export function render_query(parameters) {
    if (!parameters || typeof parameters !== 'object')
      return '';

    var result = MetaHub.extend({}, parameters);
    var query = '';
    MetaHub.extend(result, this.parameters);
    var glue = '?';
    for (var x in result) {
      query += glue + x + '=' + result[x];
      var glue = '&';
    }

    return query;
  }

  export function join(...args:any[]) {
    var i, tokens = [];
    for (i = 0; i < args.length; ++i) {
      var x = args[i];
      if (typeof x === 'number')
        x = x.toString();
      else if (typeof x !== 'string' || x.length === 0)
        continue;

      x = x.replace(/^\/*/, '')
      x = x.replace(/\/*$/, '')

      if (x.length === 0)
        continue;

      tokens.push(x);
    }

    if (tokens.length === 0)
      return '';

    // Ensure that query arguments don't have a slash in front of them.
    // Not essential but leads to cleaner output.
    if (tokens.length > 1 && tokens[tokens.length - 1][0] == '?') {
      tokens[tokens.length - 2] += tokens.pop();
    }

    var result = tokens.join('/')

    if (args[0][0] == '/')
      result = '/' + result

    return result
  }
}

export = Bloom