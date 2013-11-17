/**
 * Created with JetBrains PhpStorm.
 * Author: Christopher W. Johnson
 * Date: 10/9/13
 */

/// <reference path="../defs/jquery.d.ts" />
/// <reference path="../defs/metahub.d.ts" />
/// <reference path="../defs/handlebars.d.ts" />
/// <reference path="../defs/when.d.ts" />

import MetaHub = require('metahub')
import Handlebars = require('handlebars')
import when = require('when')

module Bloom {
  export var output = null
  export var ajax_prefix:string
  export var Wait_Animation

  export class Flower extends MetaHub.Meta_Object {
    element:JQuery;
    seed;
    static blocks = {}
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

    static load_blocks_from_string(text:string) {
      var data = $(text)
      var blocks = Flower.blocks
      data.children().each(function () {
        var child = $(this)
        var id = child.attr('name') || child[0].tagName.toLowerCase()
        if (id) {
          if (blocks[id])
            console.log('Duplicate block tag name: ' + id + '.')

          var block = blocks[id] = {
            template: Handlebars.compile(this.outerHTML)
          }

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

    static render_block(name, seed) {
      if (!Flower.blocks[name])
        throw new Error('Could not find any flower block named: ' + name)

      var template = Flower.blocks[name].template
      var source = template(seed)
      return $(source)
    }

    static grow(element_or_block_name, seed, flower:Flower = null):JQuery {
      var element:JQuery, block:JQuery, original = element, tagname:string, i

      if (typeof element_or_block_name === 'string') {
        tagname = element_or_block_name
        if (!Flower.blocks[tagname])
          throw new Error('Could not find block: ' + tagname + '.')

        block = Flower.render_block(tagname, seed)

        // Replace element
        element = block
      }
      else {
        // Expand blocks
        element = element_or_block_name
        tagname = element[0].tagName.toLowerCase()
        if (Flower.blocks[tagname]) {
          block = Flower.render_block(tagname, seed)

          // Copy attributes
          for (i = 0; i < element[0].attributes.length; ++i) {
            var attribute = element[0].attributes[i]
            block.attr(attribute.nodeName, attribute.nodeValue)
          }

          element.replaceWith(block)
          element = block
        }
      }

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
            return $('<span class="access denied"></span>')
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

      // Cycle through children
      element.children().each((i, node)=> {
        var child = Flower.grow($(node), seed, flower)
        if (block) {
          child.detach()
          element.append(child)
        }
      })

      if (flower)
        flower.grow()

      return element
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

    add_seed_child(seed):Flower {
      var flower:Flower, element:JQuery, item_type = this.item_type || Flower;
      if (this.item_block) {
        var block = Flower.render_block(this.item_block, seed)
        element = Flower.grow(block, seed)
        if (element.attr('flower')) {
          var flower_type:any = Flower.find_flower(element.attr('flower'))
          if (flower_type)
            item_type = flower_type
        }
      }
      flower = new item_type(seed, element);
      this.connect(flower, 'child', 'parent');
      return flower;
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
    var action = settings.success;
    var success = function (response) {
//      try {
//        var json = JSON.parse(response);
//      }
//      catch (e) {
//        console.log('There was a problem parsing the server response in Bloom.get');
//        console.log(e.message);
//      }

      action(response);
    };

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