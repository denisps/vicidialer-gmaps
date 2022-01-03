# vicidialer-gmaps
VICI dialer Google Maps Integration. It loads Google Maps view and allows to click on zip codes to add them to the filter list.

This js file can simply be included from admin.php right after filter textarea:

		echo "<tr bgcolor=#B6D3FC><td align=right>Filter SQL:</td><td align=left><TEXTAREA NAME=lead_filter_sql ROWS=20 COLS=50>$lead_filter_sql</TEXTAREA> $NWB#lead_filters-lead_filter_sql$NWE</td></tr>\n";
		echo '<tr bgcolor=#B6D3FC><td align=center colspan=2><div id="map" style="width:100%;height:512px"></div><script src="map.js"></script></td></tr>\n';
		echo "<tr bgcolor=#B6D3FC><td align=center colspan=2><input type=submit name=SUBMIT value=SUBMIT></td></tr>\n";
