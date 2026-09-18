// Keep asset references literal so Vite can resolve every PNG at build time.
export const spaceUiAssets = {
  panels: {
    window: new URL('./assets/kenney_ui-pack/PNG/Extra/Default/input_outline_rectangle.png', import.meta.url).href,
    windowSoft: new URL('./assets/kenney_ui-pack/PNG/Extra/Default/input_rectangle.png', import.meta.url).href,
    square: new URL('./assets/kenney_ui-pack/PNG/Extra/Default/input_square.png', import.meta.url).href,
    squareOutline: new URL('./assets/kenney_ui-pack/PNG/Extra/Default/input_outline_square.png', import.meta.url).href,
  },
  buttons: {
    primary: new URL('./assets/kenney_ui-pack/PNG/Blue/Default/button_rectangle_depth_gloss.png', import.meta.url).href,
    primaryHover: new URL('./assets/kenney_ui-pack/PNG/Blue/Double/button_rectangle_depth_gloss.png', import.meta.url).href,
    neutral: new URL('./assets/kenney_ui-pack/PNG/Grey/Default/button_rectangle_depth_gloss.png', import.meta.url).href,
    neutralHover: new URL('./assets/kenney_ui-pack/PNG/Grey/Double/button_rectangle_depth_gloss.png', import.meta.url).href,
    trueChoice: new URL('./assets/kenney_ui-pack/PNG/Green/Default/button_rectangle_depth_gloss.png', import.meta.url).href,
    trueChoiceHover: new URL('./assets/kenney_ui-pack/PNG/Green/Double/button_rectangle_depth_gloss.png', import.meta.url).href,
    falseChoice: new URL('./assets/kenney_ui-pack/PNG/Red/Default/button_rectangle_depth_gloss.png', import.meta.url).href,
    falseChoiceHover: new URL('./assets/kenney_ui-pack/PNG/Red/Double/button_rectangle_depth_gloss.png', import.meta.url).href,
  },
  progress: {
    track: new URL('./assets/kenney_ui-pack/PNG/Grey/Default/slide_horizontal_grey_section_wide.png', import.meta.url).href,
    active: new URL('./assets/kenney_ui-pack/PNG/Blue/Default/slide_horizontal_color_section_wide.png', import.meta.url).href,
    complete: new URL('./assets/kenney_ui-pack/PNG/Green/Default/slide_horizontal_color_section_wide.png', import.meta.url).href,
  },
  icons: {
    check: new URL('./assets/kenney_ui-pack/PNG/Green/Default/icon_checkmark.png', import.meta.url).href,
    cross: new URL('./assets/kenney_ui-pack/PNG/Red/Default/icon_cross.png', import.meta.url).href,
    checkOutline: new URL('./assets/kenney_ui-pack/PNG/Green/Default/icon_outline_checkmark.png', import.meta.url).href,
    crossOutline: new URL('./assets/kenney_ui-pack/PNG/Red/Default/icon_outline_cross.png', import.meta.url).href,
    play: new URL('./assets/kenney_ui-pack/PNG/Extra/Default/icon_play_light.png', import.meta.url).href,
    repeat: new URL('./assets/kenney_ui-pack/PNG/Extra/Default/icon_repeat_light.png', import.meta.url).href,
    next: new URL('./assets/kenney_ui-pack/PNG/Blue/Default/arrow_basic_e.png', import.meta.url).href,
    back: new URL('./assets/kenney_ui-pack/PNG/Grey/Default/arrow_basic_w.png', import.meta.url).href,
  },
  decoration: {
    star: new URL('./assets/kenney_ui-pack/PNG/Yellow/Default/star.png', import.meta.url).href,
    starOutline: new URL('./assets/kenney_ui-pack/PNG/Blue/Default/star_outline.png', import.meta.url).href,
    divider: new URL('./assets/kenney_ui-pack/PNG/Extra/Default/divider_edges.png', import.meta.url).href,
    cursor: new URL('./assets/kenney_ui-pack/PNG/Blue/Default/icon_circle.png', import.meta.url).href,
  },
} as const;
