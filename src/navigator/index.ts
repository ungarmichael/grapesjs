import { isString } from 'underscore';
import { Model } from '../abstract';
import Module from '../abstract/Module';
import Component from '../dom_components/model/Component';
import { hasWin, isComponent } from '../utils/mixins';
import defaults from './config/config';
import View from './view/ItemView';

export default class LayerManager extends Module<typeof defaults> {
    model?: Model;

    view?: View;

    get name(): string {
      return 'LayerManager';
    }

    init() {
      this.__initDefaults(defaults);
      this.componentChanged = this.componentChanged.bind(this);
      this.__onRootChange = this.__onRootChange.bind(this);
      this.model = new Model(this);
      // @ts-ignore
      this.config.stylePrefix = this.config.pStylePrefix;
      return this;
    }

    onLoad() {
      const { em, config, model } = this;
      model?.listenTo(em, 'component:selected', this.componentChanged);
      model?.listenToOnce(em, 'load', () => this.setRoot(config.root));
      model?.on('change:root', this.__onRootChange);
      this.componentChanged();
    }

    postRender() {
      this.__appendTo();
    }

    /**
     * Set new root for layers
     * @param {Component|string} component Component to be set as the root
     * @return {Component}
     */
    setRoot(component: Component | string): Component {
      const wrapper: Component = this.em.getWrapper();
      let root = isComponent(component) ? component as Component : wrapper;

      if (component && isString(component) && hasWin()) {
        root = wrapper.find(component)[0] || wrapper;
      }

      this.model?.set('root', root);

      return root;
    }

    /**
     * Get the root of layers
     * @return {Component}
     */
    getRoot() {
      return this.model?.get('root');
    }

    /**
     * Return the view of layers
     * @return {View}
     */
    getAll() {
      return this.view;
    }

    /**
     * Triggered when the selected component is changed
     * @private
     */
    componentChanged(sel?: Component, opts = {}) {
      // @ts-ignore
      if (opts.fromLayers) return;
      const { em, config } = this;
      const { scrollLayers } = config;
      const opened = em.get('opened');
      const selected = em.getSelected();
      let parent = selected?.parent();

      for (let cid in opened) {
        opened[cid].set('open', 0);
      }

      while (parent) {
        parent.set('open', 1);
        opened[parent.cid] = parent;
        parent = parent.parent();
      }

      if (selected && scrollLayers) {
        const el = selected.viewLayer?.el;
        el?.scrollIntoView(scrollLayers);
      }
    }

    render() {
      const { em, config } = this;
      const ItemView = View.extend(config.extend);
      this.view = new ItemView({
        el: this.view?.el,
        ItemView,
        level: 0,
        config,
        opened: em.get('opened') || {},
        model: this.getRoot(),
      });
      return this.view?.render().el as HTMLElement;
    }

    destroy() {
      this.view?.remove();
    }

    __onRootChange() {
      this.view?.setRoot(this.getRoot());
    }
};
