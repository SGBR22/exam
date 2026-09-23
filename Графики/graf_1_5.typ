#import "@preview/modern-g7-32:0.2.0": gost
#import "@preview/lilaq:0.6.0" as lq




#let data-1-sec = lq.load-txt(
  read("1s_heat.csv"),
  comments: "%",
  converters: float,
)

#let data-5-hours = lq.load-txt(
  read("Распределение_за5час.csv"),
  comments: "%",
  converters: float,
)

#let time-1-sec = data-1-sec.at(0)
#let temperature-1-sec = data-1-sec.at(1)
#let time-5-hours = data-5-hours.at(0)
#let temperature-5-hours = data-5-hours.at(1)



#v(1em)

#lq.diagram(
  width: 15cm,
  height: 20cm,
  title: [Изменение температуры во времени],
  xlabel: [Время, с],
  ylabel: [Температура, °C],
  grid: (stroke: (paint: luma(0%), thickness: 0.4pt, dash: "dashed")),
  xlim: (0, 1.1),
  ylim: (19, 95),
  lq.plot(
    time-1-sec,
    temperature-1-sec,
    color: rgb("#1f77b4"),
    stroke: 1.4pt + rgb("#1f77b4"),
    mark: "o",
    mark-size: 4pt,
    label: [Температура],
  ),
)


#v(1em)

#lq.diagram(
  width: 15cm,
  height: 20cm,
  title: [Изменение температуры во времени],
  xlabel: [Время, ч],
  ylabel: [Температура, °C],
  grid: (stroke: (paint: luma(0%), thickness: 0.4pt, dash: "dashed")),
  xlim: (0, 5.3),
  ylim: (19, 35),
  lq.plot(
    time-5-hours,
    temperature-5-hours,
    color: rgb("#d62728"),
    stroke: 1.4pt + rgb("#d62728"),
    mark: "o",
    mark-size: 4pt,
    label: [Температура],
  ),
)
